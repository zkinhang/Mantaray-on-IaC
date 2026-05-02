import os
import json
from flask import Blueprint, request, jsonify
from models import db, RobotParameter

bp = Blueprint('parameters', __name__, url_prefix='/api/parameters')

ROBOT_PARAMS_FILE_PATH = os.environ.get('ROBOT_PARAMS_FILE_PATH', 'robot_params.json')

@bp.route('', methods=['GET'])
def get_latest_parameters():
    # Fetch the most recent parameter layout
    latest_params = RobotParameter.query.order_by(RobotParameter.created_at.desc()).first()
    if not latest_params:
        return jsonify({'message': 'No parameters found'}), 404
        
    return jsonify(latest_params.to_dict()), 200

@bp.route('/history', methods=['GET'])
def get_parameter_history():
    # Bring back history for diff view
    params = RobotParameter.query.order_by(RobotParameter.created_at.desc()).all()
    return jsonify([p.to_dict() for p in params]), 200

@bp.route('', methods=['POST'])
def save_parameters():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid. No JSON data provided'}), 400

    # Ensure format is correct when returning string
    json_string = json.dumps(data, indent=4)

    # 1. Save to SQLite for Diff/History functionality
    new_param = RobotParameter(parameters_json=json_string)
    db.session.add(new_param)
    db.session.commit()

    # 2. Write to the physical JSON file for ROS2/Ansible integration
    try:
        with open(ROBOT_PARAMS_FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(json_string)
    except IOError as e:
        return jsonify({'error': f'Failed to write robot_params.json: {str(e)}'}), 500

    return jsonify({
        'message': 'Parameters saved and deployed successfully',
        'data': new_param.to_dict()
    }), 201
