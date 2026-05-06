import os
import argparse
from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db
from routes import bp as parameters_bp
import uuid

def create_app(params_path=None):
    app = Flask(__name__)
    
    # Configure SQLite Database and file path (relative to the folder on disk)
    db_path = os.getenv('DATABASE_URL', 'sqlite:///robot_configs.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = db_path
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JSON_SORT_KEYS'] = False
    
    # Set the robot parameters file path
    app.config['ROBOT_PARAMS_FILE_PATH'] = params_path or os.environ.get('ROBOT_PARAMS_FILE_PATH', 'robot_params.json')

    # Initialize Extensions
    db.init_app(app)
    CORS(app) # Enable unrestricted CORS for local front-end

    # Request ID middleware
    @app.before_request
    def assign_request_id():
        request.request_id = str(uuid.uuid4())

    # Register Blueprints
    app.register_blueprint(parameters_bp)

    # Initialize DB (creates tables if they don't exist)
    with app.app_context():
        db.create_all()

    # Error handling
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error), 'request_id': getattr(request, 'request_id', '')}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': str(error), 'request_id': getattr(request, 'request_id', '')}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred', 'request_id': getattr(request, 'request_id', '')}), 500

    return app

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the Parameter Configurator API')
    parser.add_argument('--params-path', type=str, help='Path to robot_params.json', default='robot_params.json')
    args = parser.parse_args()

    app = create_app(params_path=args.params_path)
    app.run(host='0.0.0.0', port=5000)
