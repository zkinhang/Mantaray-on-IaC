import numpy as np
from custom_interfaces.msg import ThrusterBoardStatus

class ThrusterBoardInfo:
    def __init__(self) -> None:
        self.depth = 0
        self.connected = False
        self.thruster = [128 for _ in range(8)]

    def update(self, msg : ThrusterBoardStatus) -> None:
        self.depth = msg.depth
        self.connected = msg.connected
        self.thruster = msg.thruster


class RobotMovement:
    def __init__(self, directionMatrix : np.array) -> None:
        self.directionMatrix = directionMatrix

# --- Default Movement Matrix Definitions (for clarity and testing) ---
# --- The main ROS2 node will override these with parameters ---

HOLD = np.array([
    1, 1, 1, 1,
    1, 1, 1, 1
])

FORWARD = np.array([
    -1.0, -0.8, 1.0, 1.0,
    0.0 ,0.0 ,0.0 ,0.0
])

UP = np.array([
    0.0,0.0,0.0,0.0,
    1.0,1.0,1.0,1.0
    
]) * -1

LEFT = np.array([
    1.0, -1.0, 1.0, -1.0,
    0.0, 0.0, 0.0, 0.0
])

LEFT_YAW = np.array([
    1.0, -1.0, -1.0, 1.0,
    0.0, 0.0, 0.0, 0.0
])

FRONT_PITCH = np.array([
    0.0, 0.0, 0.0, 0.0,
    -1.0, -1.0, 1.0, 1.0
])


STOP = np.array([
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0
])

LEFT_ROLL = np.array([
    0.0, 0.0, 0.0, 0.0,
    -1.0, 1.0, -1.0, 1.0
])

