import os
import json
import shutil
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from models import db, RobotParameter

bp = Blueprint('parameters', __name__, url_prefix='/api/parameters')

def backup_and_deploy(json_string, file_path):
    """
    Moves current file to checkpoints/ then writes new content.
    Creates parent directories if they don't exist.
    """
    target_dir = os.path.dirname(os.path.abspath(file_path))
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    if os.path.exists(file_path):
        checkpoint_dir = os.path.join(target_dir, 'checkpoints')
        
        if not os.path.exists(checkpoint_dir):
            os.makedirs(checkpoint_dir, exist_ok=True)
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = os.path.basename(file_path)
        backup_name = f"{os.path.splitext(filename)[0]}_{timestamp}{os.path.splitext(filename)[1]}"
        backup_path = os.path.join(checkpoint_dir, backup_name)
        
        try:
            shutil.move(file_path, backup_path)
        except Exception as e:
            raise IOError(f"Failed to move existing file to checkpoints: {str(e)}")

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(json_string)
    except IOError as e:
        raise IOError(f"Failed to write new {os.path.basename(file_path)}: {str(e)}")

@bp.route('', methods=['GET'])
def get_latest_parameters():
    # Fetch the most recent deployed parameter layout
    latest_params = RobotParameter.query.filter_by(is_draft=False).order_by(RobotParameter.created_at.desc()).first()
    if not latest_params:
        # Fallback to any latest if no deployed found
        latest_params = RobotParameter.query.order_by(RobotParameter.created_at.desc()).first()
    if not latest_params:
        return jsonify({'message': 'No parameters found'}), 404
        
    return jsonify(latest_params.to_dict()), 200

@bp.route('/history', methods=['GET'])
def get_parameter_history():
    # Bring back history for diff view
    params = RobotParameter.query.order_by(RobotParameter.created_at.desc()).all()
    return jsonify([p.to_dict() for p in params]), 200

@bp.route('/<int:param_id>/star', methods=['PATCH'])
def toggle_star(param_id):
    param = RobotParameter.query.get_or_404(param_id)
    data = request.get_json(silent=True) or {}
    
    # 1. Provide Explicit User Input Validation
    if 'is_starred' in data:
        if not isinstance(data['is_starred'], bool):
            return jsonify({'error': 'is_starred must be a boolean value'}), 400
        param.is_starred = data['is_starred']
    else:
        param.is_starred = not param.is_starred
        
    # 2. Error Handle Database Transactions properly
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database transaction failed: {str(e)}'}), 500
        
    return jsonify(param.to_dict()), 200

@bp.route('', methods=['POST'])
def save_parameters():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid. No JSON data provided'}), 400

    # Extract optional version name and the parameters payload
    version_name = data.get('version_name')
    is_draft = data.get('is_draft', False)
    parameters_payload = data.get('parameters', data) # Fallback if frontend sends raw config

    # Ensure format is correct when returning string
    json_string = json.dumps(parameters_payload, indent=4)

    # 1. Save to SQLite for Diff/History functionality
    new_param = RobotParameter(
        parameters_json=json_string,
        version_name=version_name,
        is_draft=is_draft
    )
    db.session.add(new_param)
    db.session.commit()

    # 2. Write to the physical JSON file ONLY if it's not a draft
    if not is_draft:
        file_path = current_app.config.get('ROBOT_PARAMS_FILE_PATH', 'robot_params.json')
        try:
            backup_and_deploy(json_string, file_path)
        except IOError as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({
        'message': 'Saved as draft successfully' if is_draft else 'Parameters saved and deployed successfully',
        'data': new_param.to_dict()
    }), 201
