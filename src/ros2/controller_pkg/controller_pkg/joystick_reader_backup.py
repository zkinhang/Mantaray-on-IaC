# this node read the joystick input and publish the command to the topic "/controller/console" in the form of Twist message
import rclpy
from rclpy.node import Node
from inputs import get_gamepad
import math
from geometry_msgs.msg import Twist
from std_msgs.msg import Float64
from custom_interfaces.msg import PowerLimit
import threading
import numpy as np


class XboxController(object):
    MAX_TRIG_VAL = math.pow(2, 8)
    MAX_JOY_VAL = math.pow(2, 15)

    def __init__(self):
        self.LeftJoystickY = 0
        self.LeftJoystickX = 0
        self.RightJoystickY = 0
        self.RightJoystickX = 0
        self.LeftTrigger = 0
        self.RightTrigger = 0
        self.LeftBumper = 0
        self.RightBumper = 0
        self.A = 0
        self.X = 0
        self.Y = 0
        self.B = 0
        self.LeftThumb = 0
        self.RightThumb = 0
        self.Back = 0
        self.Start = 0
        self.XDPad = 0
        self.YDPad = 0

    def read(self): # return the buttons/triggers that you care about in this methode
        lx = self.LeftJoystickX
        ly = self.LeftJoystickY
        rx = self.RightJoystickX
        ry = self.RightJoystickY
        dx = self.XDPad
        dy = self.YDPad
        # rx = self.LeftTrigger
        # ry = self.RightTrigger
        
        # controlling gripper
        Gopen = self.LeftTrigger
        Gclose = self.RightTrigger
        # Note: the value of X and Y are interchanged
        Gup = self.X
        Gdown = self.A
        GantiClockwise = self.Y
        Gclockwise = self.B
        # print(f"Gopen: {Gopen}, Gclose: {Gclose}, Gup: {Gup}, Gdown: {Gdown}, GantiClockwise: {GantiClockwise}, Gclockwise: {Gclockwise}")
        return [lx, ly, rx, ry, dx, dy], [Gopen, Gclose, Gup, Gdown, GantiClockwise, Gclockwise]

    # normalize the value between -1 and 1, for the pwm calculation in further steps
    def normalize(self, value):
        normalized_value = value / XboxController.MAX_JOY_VAL
        if -2500 <= value <= 2500:
            normalized_value = 0
        return normalized_value
    
    def trigger_normalize(self, value):
        return 1 if value > 0 else 0

    def read_controller(self):
        events = get_gamepad()
        for event in events:
            if event.code == 'ABS_Y':
                self.LeftJoystickY = self.normalize(event.state)
            elif event.code == 'ABS_X':
                self.LeftJoystickX = self.normalize(event.state)
            elif event.code == 'ABS_RY':
                self.RightJoystickY = self.normalize(event.state)
            elif event.code == 'ABS_RX':
                self.RightJoystickX = self.normalize(event.state)
            elif event.code == 'ABS_HAT0X':
                self.XDPad = float(event.state)
            elif event.code == 'ABS_HAT0Y':
                self.YDPad = float(event.state)
            # uncomment the following lines if more buttons are needed
            elif event.code == 'ABS_Z':
                self.LeftTrigger = self.trigger_normalize(event.state)
            elif event.code == 'ABS_RZ':
                self.RightTrigger = self.trigger_normalize(event.state)
            # elif event.code == 'BTN_TL':
            #     self.LeftBumper = event.state
            # elif event.code == 'BTN_TR':
            #     self.RightBumper = event.state
            elif event.code == 'BTN_SOUTH':
                self.A = event.state  # button A
            elif event.code == 'BTN_NORTH':
                self.Y = event.state  # button Y
            elif event.code == 'BTN_WEST':
                self.X = event.state  # button X
            elif event.code == 'BTN_EAST':
                self.B = event.state  # button B
            # elif event.code == ' BTN_THUMBL':
            #     self.LeftThumb = event.state
            # elif event.code == 'BTN_THUMBR':
            #     self.RightThumb = event.state
            # elif event.code == 'BTN_SELECT':
            #     self.Back = event.state
            # elif event.code == 'BTN_START':
            #     self.Start = event.state


class ConsoleCommand(Node):

    def __init__(self):
        super().__init__("console_control")
        # Add publisher for joystick command
        self.joystick_cmd = self.create_publisher(
            Twist, 
            "/pid/cmd_vel", 
            10)
        self.gripper_cmd = self.create_publisher(
            Twist, 
            "/controller/gripper", 
            10)
        # Add subscription for power limits
        self.power_limit_sub_forward = self.create_subscription(
            PowerLimit,
            "/controller/power_limit",
            self.power_limit_callback,
            10
        )
        
        self.console = XboxController()
        self.get_logger().info("Start sending command")
        timer_period = 1 / 30
        self.movement_output = Twist()
        self.gripper_output = Twist()
        
        # Default power limit
        self.power_limit = PowerLimit()
        self.power_limit.forward = 0.3
        self.power_limit.rightward = 0.3
        self.power_limit.upward = 0.3
        self.power_limit.yaw = 0.3
        self.power_limit.pitch = 0.3
        self.power_limit.roll = 0.3
        self.get_logger().info(f"Default power limit = forward: {self.power_limit.forward}, rightward: {self.power_limit.rightward}, upward: {self.power_limit.upward}, yaw: {self.power_limit.yaw}, pitch: {self.power_limit.pitch}, roll: {self.power_limit.roll}")
        
        self.timer_output = self.create_timer(timer_period, self.send_commands)
        job = threading.Thread(target=self.read_joystick_command)
        job.start()
        
    def power_limit_callback(self, msg: PowerLimit):
        """
        Callback function for the power limit subscription.
        Updates the power limit value when new data is received from the topic.
        
        Args:
            msg (Float64): The message containing the new power limit value
        """
        self.power_limit = msg
        self.get_logger().info(f"Power limit updated")

    def send_movement_command(self):
        cmd_twist = self.movement_output
        self.joystick_cmd.publish(self.movement_output)
        self.get_logger().info(f'linear x: "{cmd_twist.linear.x}", y: "{cmd_twist.linear.y}", z: "{cmd_twist.linear.z}", angular x: "{cmd_twist.angular.x}", y: "{cmd_twist.angular.y}", z: "{cmd_twist.angular.z}"')

    def send_gripper_command(self):
        cmd_twist = self.gripper_output
        self.gripper_cmd.publish(self.gripper_output)
        self.get_logger().info(f'gripper linear x: "{cmd_twist.linear.x}", y: "{cmd_twist.linear.y}", z: "{cmd_twist.linear.z}", angular x: "{cmd_twist.angular.x}", y: "{cmd_twist.angular.y}", z: "{cmd_twist.angular.z}"')

    def send_commands(self):
        self.send_movement_command()
        self.send_gripper_command()

    def read_joystick_command(self):
        while True:
            self.console.read_controller()
            movement_cmd, gripper_cmd = self.console.read()
            full_movement_cmd = [float(i) for i in movement_cmd]
            
            # Apply specific power limits to each axis
            # structure of cmd: [left joystick x(lx), ly, right joystick x (rx), ry, d pad x (dx), dy]
            movement_cmd = [
                np.clip(full_movement_cmd[0], -self.power_limit.yaw, self.power_limit.yaw),          # lx -> yaw
                np.clip(full_movement_cmd[1], -self.power_limit.forward, self.power_limit.forward),   # ly -> forward
                np.clip(full_movement_cmd[2], -self.power_limit.rightward, self.power_limit.rightward), # rx -> rightward
                np.clip(full_movement_cmd[3], -self.power_limit.upward, self.power_limit.upward),     # ry -> upward
                np.clip(full_movement_cmd[4], -self.power_limit.roll, self.power_limit.roll),         # dx -> roll
                np.clip(full_movement_cmd[5], -self.power_limit.pitch, self.power_limit.pitch)        # dy -> pitch
            ]
            
            # New control mapping:
            # Left stick X -> yaw (angular.z)
            # Left stick Y -> forward/backward (linear.x)
            # Right stick X -> left/right (linear.y)
            # Right stick Y -> up/down (linear.z)
            # D-pad X -> roll (angular.y)
            # D-pad Y -> pitch (angular.x)
            movement_cmd_twist = Twist()
            # movement_cmd_twist.angular.z     = movement_cmd[0] * -1   # left joystick x (yaw)
            # movement_cmd_twist.linear.x      = movement_cmd[1] * -1   # left joystick y (forward/backward)
            # movement_cmd_twist.linear.y      = movement_cmd[2] * -1   # right joystick x (left/right)
            # movement_cmd_twist.linear.z      = movement_cmd[3] * -1   # right joystick y (up/down)
            # movement_cmd_twist.angular.x     = movement_cmd[4] * -1   # d-pad x (roll)
            # movement_cmd_twist.angular.y     = movement_cmd[5] * -1   # d-pad y (pitch)
            movement_cmd_twist.linear.x      = movement_cmd[1] * -1   # left joystick y (forward/backward)
            movement_cmd_twist.linear.y      = movement_cmd[0] * -1   # left joystick x (yaw)
            movement_cmd_twist.linear.z      = movement_cmd[3] * -1   # right joystick y (up/down)
            movement_cmd_twist.angular.x     = movement_cmd[4] * -1   # d-pad x (roll)
            movement_cmd_twist.angular.y     = movement_cmd[5] * -1   # d-pad y (pitch)
            movement_cmd_twist.angular.z     = movement_cmd[2] * -1   # right joystick x (left/right)
            
            self.movement_output = movement_cmd_twist
            
            gripper_cmd = [float(i) for i in gripper_cmd]
            gripper_cmd_twist = Twist()
            
            gripper_cmd_twist.linear.x      = gripper_cmd[0]        # left trigger
            gripper_cmd_twist.linear.y      = gripper_cmd[1]        # right trigger
            gripper_cmd_twist.linear.z      = gripper_cmd[2]        # button Y
            gripper_cmd_twist.angular.z     = gripper_cmd[3]        # button A
            gripper_cmd_twist.angular.x     = gripper_cmd[4]        # button X
            gripper_cmd_twist.angular.y     = gripper_cmd[5]        # button B
            self.gripper_output = gripper_cmd_twist
        
            #self.get_logger().info(command.data)
            #print(cmd.data)
            #self.joystick_cmd.publish(cmd)
            # while cmd_twist.linear.x != 0.0 or cmd_twist.angular.z != 0.0:
            #     print(cmd)
            #     self.joystick_cmd.publish(cmd_twist)
            #     self.get_logger().info(f'linear x: "{cmd_twist.linear.x}", y: "{cmd_twist.linear.y}", z: "{cmd_twist.linear.z}", angular x: "{cmd_twist.angular.x}", y: "{cmd_twist.angular.y}", z: "{cmd_twist.angular.z}"')

def main(args=None):
    rclpy.init(args=args)
    node = ConsoleCommand()
    # while True:
    #     try:
    #         node.send_joystick_command(console)
    #     except Exception as e:
    #         node.get_logger().error(f"Error reading controller: {e}")
    #         time.sleep(1.0)
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
    
    