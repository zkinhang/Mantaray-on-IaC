import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from thrusterboard_pkg.ThrusterBoard_API import ThrusterBoard
from time import sleep, time
from serial.tools.list_ports_common import ListPortInfo
import serial
import numpy as np
from queue import Queue
import re
from std_msgs.msg import Bool, Float64
from custom_interfaces.msg import ThrusterBoardStatus
from thrusterboard_pkg.Configuration import RobotMovement # Import class only


class thrusterboard_rosserial(Node):

    def __init__(self):
        super().__init__('thrusterboard_rosserial')
        
        # --- DECLARE PARAMETERS (from robot_params.json) ---
        self.declare_parameter('thrusterboard_config.board_hw_id', '1A86:7523')
        self.declare_parameter('thrusterboard_config.port_name', 'USB0')
        self.declare_parameter('thrusterboard_config.mapping', [-4,2,3,-1,-5,-8,6,7])

        default_matrix = [0.0] * 8
        self.declare_parameter('thruster_direction_matrices.HOLD', default_matrix)
        self.declare_parameter('thruster_direction_matrices.FORWARD', default_matrix)
        self.declare_parameter('thruster_direction_matrices.UP', default_matrix)
        self.declare_parameter('thruster_direction_matrices.LEFT', default_matrix)
        self.declare_parameter('thruster_direction_matrices.LEFT_YAW', default_matrix)
        self.declare_parameter('thruster_direction_matrices.FRONT_PITCH', default_matrix)
        self.declare_parameter('thruster_direction_matrices.LEFT_ROLL', default_matrix)
        
        # --- GET PARAMETERS ---
        self.board_hw_id = self.get_parameter('thrusterboard_config.board_hw_id').get_parameter_value().string_value
        self.preferred_port_name = self.get_parameter('thrusterboard_config.port_name').get_parameter_value().string_value
        self.mapping = self.get_parameter('thrusterboard_config.mapping').get_parameter_value().integer_array_value

        # Get matrices and create RobotMovement instances
        self.hold_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.HOLD').get_parameter_value().double_array_value))
        self.xAxis_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.FORWARD').get_parameter_value().double_array_value))
        self.zAxis_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.UP').get_parameter_value().double_array_value))
        self.yAxis_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.LEFT').get_parameter_value().double_array_value))
        self.pitch_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.FRONT_PITCH').get_parameter_value().double_array_value))
        self.yaw_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.LEFT_YAW').get_parameter_value().double_array_value))
        self.roll_Movement = RobotMovement(np.array(self.get_parameter('thruster_direction_matrices.LEFT_ROLL').get_parameter_value().double_array_value))
        
        # --- END OF PARAMETER SECTION ---

        self.thrustboard : ThrusterBoard = None
        self.holdMode = False
        self.queue = Queue()
        self.last_args = np.array([0 for _ in range(8)])
        
        self.publisher_status = self.create_publisher(ThrusterBoardStatus, '/thruster/status', 10)
        self.subscriptions_hold = self.create_subscription(
            Bool, 
            '/thruster/hold',
            self.hold_callback,
            10)
        self.subscriptions_ack = self.create_subscription(
            ThrusterBoardStatus,
            '/thruster/status',
            self.ack_callback,
            10)
        self.cmd_subscriber = self.create_subscription(
            Twist, 
            '/pid/cmd_vel',
            self.cmd_listener_callback,
            10)
        
        self.get_logger().info(f"Thruster node initialized. HW_ID: {self.board_hw_id}, Port Name: {self.preferred_port_name}")
        self.ack_callback(ThrusterBoardStatus())

    def check_connection(self) -> bool:
        """Checking the connection.

        Returns:
            bool: True if connected
        """
        try:
            if self.thrustboard is None:
                self.thrustboard = None  # Reset the connection
                PL = serial.tools.list_ports.comports()
                port = ""
                for i in PL:
                    groups = i.hwid.split(" ")
                    
                    # Use parameter for preferred port name
                    if self.preferred_port_name in i.device: 
                        self.get_logger().info(f"Found thrusterboard: {i.device}")
                        port = i.device
                        break
                    # find VID:PID in groups
                    for g in groups:
                        if re.match(r"VID:PID=\w{4}:\w{4}", g):
                            vid_pid = g.split("=")[1]
                            # Use parameter for board_hw_id
                            if vid_pid == self.board_hw_id: 
                                self.get_logger().info(f"Found device by HW_ID: {i.device}")
                                port = i.device
                    # if "USB0" in i.device:
                    #     port = i.device
                if port == "":
                    # self.get_logger().info('No robot found')
                    pass
                else:
                    self.thrustboard = ThrusterBoard(port, 115200, self.mapping)
                    self.get_logger().info('Connected to Thrusterboard')
                    sleep(1)
        except Exception as e:
            self.get_logger().error('Error in check_connection: {}'.format(e))
        return self.thrustboard is not None

    def ack_callback(self, msg : ThrusterBoardStatus) -> None:
        """Callback function for the /robot/status.

        Args:
            msg (Bool): The message from the robot
        """
        st = time()
        ok = msg.connected
        try:
            if ok:
                func = self.thrustboard.set_Thruster
                args = self.last_args
                if not self.queue.empty():
                    func, args = self.queue.get()
                    self.last_args = args
                data = func(args)
                # self.get_logger().info(f"{func} -> {args} -> {data}")
                msg.depth = float(self.thrustboard.depth if self.thrustboard.depth is not None else 0)
            else:
                self.get_logger().info('No thrusterboard connected')
                sleep(1)
        except Exception as e:
            self.get_logger().error('Error in ack_callback: {}'.format(e))
            self.thrustboard = None
        msg.connected = self.check_connection()
        
        
        time_used = time() - st
        # self.get_logger().info(f"Time used: {time_used}")
        if time_used < 1/30:
            sleep(1/30 - time_used)
        # sleep(1/100)
        self.publisher_status.publish(msg)

    def hold_callback(self, msg : Bool) -> None:
        """Callback function for the /robot/hold.

        Args:
            msg (Bool): The message from the robot
        """
        self.holdMode = msg.data
        self.get_logger().info(f"hold mode: {self.holdMode}")


    def cmd_listener_callback(self, msg : Twist):
        # x, y, z, pitch, yaw, roll
        ratio = msg.linear.x * self.xAxis_Movement.directionMatrix + msg.linear.y * self.yAxis_Movement.directionMatrix + msg.linear.z * self.zAxis_Movement.directionMatrix + msg.angular.x * self.roll_Movement.directionMatrix + msg.angular.y * self.pitch_Movement.directionMatrix + msg.angular.z * self.yaw_Movement.directionMatrix
        if self.holdMode:
            ratio += self.hold_Movement.directionMatrix * 0.1
        # self.get_logger().info(f'Direction Ratio: {msg.linear.x}, {msg.linear.y}, {msg.linear.z}, {msg.angular.x}, {msg.angular.y}, {msg.angular.z}')
        ratio = np.clip(ratio, -1, 1)
        # if all 0 then hold
        # if np.all(ratio == 0):
            # ratio = hold_Movement.directionMatrix * 0.1
        # ratio = np.array([
        #     ratio[3], ratio[2], ratio[1], ratio[0],
        #     ratio[7], ratio[6], ratio[5], ratio[4]
        # ])
        # the max size of queue is 3
        if self.thrustboard is not None:
            if self.queue.qsize() < 3:
                self.queue.put((self.thrustboard.set_Thruster, ratio))
            else:
                # remove the oldest
                self.queue.get()
                self.queue.put((self.thrustboard.set_Thruster, ratio))
        info = f"""
        output:
        x: {msg.linear.x}
        y: {msg.linear.y}
        z: {msg.linear.z}
        roll: {msg.angular.x}
        pitch: {msg.angular.y}
        yaw: {msg.angular.z}
        queue size: {self.queue.qsize()}
        """
        self.get_logger().info(info)
        


def main(args=None):
    # ROS2 initialization
    rclpy.init(args=args)
    controller = thrusterboard_rosserial()
    # controller.get_logger().set_level(rclpy.logging.LoggingSeverity.DEBUG)
    rclpy.spin(controller)
    rclpy.shutdown()


if __name__ == '__main__':
    main()