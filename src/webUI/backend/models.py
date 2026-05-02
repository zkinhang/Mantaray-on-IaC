from datetime import datetime, timezone
import json
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class RobotParameter(db.Model):
    __tablename__ = 'robot_parameters'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parameters_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'parameters': json.loads(self.parameters_json),
            'createdAt': self.created_at.isoformat()
        }
