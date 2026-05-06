import os
import json
from flask import Blueprint, request, jsonify
from models import db, RobotParameter

bp = Blueprint('parameters', __name__, url_prefix='/api/parameters')

ROBOT_PARAMS_FILE_PATH = os.environ.get('ROBOT_PARAMS_FILE_PATH', 'robot_params.json')

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
        try:
            with open(ROBOT_PARAMS_FILE_PATH, 'w', encoding='utf-8') as f:
                f.write(json_string)
        except IOError as e:
            return jsonify({'error': f'Failed to write robot_params.json: {str(e)}'}), 500

    return jsonify({
        'message': 'Saved as draft successfully' if is_draft else 'Parameters saved and deployed successfully',
        'data': new_param.to_dict()
    }), 201
