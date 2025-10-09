# this node read the joystick input and publish the command to the topic "/controller/console" in the form of Twist message
import rclpy
from rclpy.node import Node
import pygame
import math
from geometry_msgs.msg import Twist
from std_msgs.msg import Float64
from custom_interfaces.msg import PowerLimit
import threading
import numpy as np
import time


class XboxController(object):
    def __init__(self):
        # Initialize pygame and joystick module
        pygame.init()
        pygame.joystick.init()
        
        # Controller state variables
        self.LeftJoystickY = 0.0
        self.LeftJoystickX = 0.0
        self.RightJoystickY = 0.0
        self.RightJoystickX = 0.0
        self.LeftTrigger = 0.0
        self.RightTrigger = 0.0
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
        self.XDPad = 0.0
        self.YDPad = 0.0
        
        # Connection state
        self.joystick = None
        self.joystick_id = 0
        self._connected = False
        
        # Start monitoring thread
        self._monitor_thread = threading.Thread(target=self._monitor_controller, args=())
        self._monitor_thread.daemon = True
        self._monitor_thread.start()
    
    def _monitor_controller(self):
        """Thread to monitor controller connection status and process events"""
        while True:
            try:
                # Check for connection/disconnection events
                for event in pygame.event.get():
                    if event.type == pygame.JOYDEVICEADDED:
                        self._handle_connect(event.device_index)
                    elif event.type == pygame.JOYDEVICEREMOVED:
                        if self._connected and event.instance_id == self.joystick.get_instance_id():
                            self._handle_disconnect()
                
                # If connected, update controller state
                if self._connected:
                    self._update_controller_state()
                else:
                    # Try to connect if no controller is connected
                    self._try_connect()
                    
                # Small delay to prevent high CPU usage
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Controller monitoring error: {e}")
                time.sleep(0.5)
    
    def _try_connect(self):
        """Try to connect to a controller if one is available"""
        try:
            # Re-enumerate joysticks (needed for disconnected devices)
            pygame.joystick.quit()
            pygame.joystick.init()
            
            joystick_count = pygame.joystick.get_count()
            if joystick_count > 0:
                self._handle_connect(0)  # Connect to the first available controller
        except Exception as e:
            print(f"Error connecting to controller: {e}")
    
    def _handle_connect(self, device_index):
        """Handle controller connection"""
        try:
            self.joystick = pygame.joystick.Joystick(device_index)
            self.joystick.init()
            self.joystick_id = self.joystick.get_instance_id()
            self._connected = True
            print(f"Controller connected: {self.joystick.get_name()}")
        except Exception as e:
            print(f"Failed to initialize controller: {e}")
            self._connected = False
    
    def _handle_disconnect(self):
        """Handle controller disconnection"""
        print("Controller disconnected")
        if self.joystick:
            self.joystick = None
        self._connected = False
        
        # Reset all values to zero when disconnected
    def _update_controller_state(self):
        """Update all controller values"""
        if not self._connected or not self.joystick:
            return
        
        try:
            # Update events before reading values
            pygame.event.pump()
            
            # Get joystick values - standard Xbox controller mapping
            self.LeftJoystickX = self.joystick.get_axis(0)
            self.LeftJoystickY = self.joystick.get_axis(1)
            self.RightJoystickX = self.joystick.get_axis(3) 
            self.RightJoystickY = self.joystick.get_axis(4)
            
            # Triggers (may vary by platform)
            self.LeftTrigger = max(0, self.joystick.get_axis(2))  # Convert -1 to 1 range to 0 to 1
            self.RightTrigger = max(0, self.joystick.get_axis(5))  # Convert -1 to 1 range to 0 to 1
            
            # Handle D-pad (varies by pygame implementation)
            # This may need adjustment based on your specific controller
            try:
                hat = self.joystick.get_hat(0)
                self.XDPad = float(hat[0])
                self.YDPad = float(hat[1])
            except:
                # Fallback if hat not available
                self.XDPad = 0.0
                self.YDPad = 0.0
            
            # Buttons - specific to Xbox controller layout
            self.A = self.joystick.get_button(0)
            self.B = self.joystick.get_button(1)
            self.X = self.joystick.get_button(2)
            self.Y = self.joystick.get_button(3)
            self.LeftBumper = self.joystick.get_button(4)
            self.RightBumper = self.joystick.get_button(5)
            self.Back = self.joystick.get_button(6)
            self.Start = self.joystick.get_button(7)
            self.LeftThumb = self.joystick.get_button(8)
            self.RightThumb = self.joystick.get_button(9)
            
        except Exception as e:
            print(f"Error reading controller state: {e}")
    
    def read(self):
        """Return the buttons/triggers that you care about in this method"""
        lx = self.LeftJoystickX
        ly = self.LeftJoystickY
        rx = self.RightJoystickX
        ry = self.RightJoystickY
        dx = self.XDPad
        dy = self.YDPad
        
        # Controlling gripper
        Gopen = self.LeftTrigger
        Gclose = self.RightTrigger
        Gup = self.X
        Gdown = self.A
        GantiClockwise = self.Y
        Gclockwise = self.B
        
        # Controlling second gripper
        Gopen2 = self.LeftBumper
        Gclose2 = self.RightBumper
        Gup2 = self.Y
        Gdown2 = self.X
        GantiClockwise2 = self.LeftTrigger
        Gclockwise2 = self.RightTrigger
        
        return [lx, ly, rx, ry, dx, dy], [Gopen, Gclose, Gup, Gdown, GantiClockwise, Gclockwise], [Gopen2, Gclose2, Gup2, Gdown2, GantiClockwise2, Gclockwise2]
    
    def read_controller(self):
        """Check if controller is connected and return connection status"""
        return self._connected


class ConsoleCommand(Node):

    def __init__(self):
        super().__init__("console_control")
        # Add publisher for joystick command
        self.joystick_cmd = self.create_publisher(
            Twist, 
            "/cmd_vel", 
            10)
        # self.joystick_cmd = self.create_publisher(
        #     Twist, 
        #     "/pid/cmd_vel", 
        #     10)
        self.gripper_cmd = self.create_publisher(
            Twist, 
            "/controller/gripper", 
            10)
        self.sec_gripper_cmd = self.create_publisher(
            Twist, 
            "/controller/sec_gripper", 
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
        timer_period = 1 / 30.0
        self.movement_output = Twist()
        self.gripper_output = Twist()
        self.sec_gripper_output = Twist()
        
        # Default power limit
        self.power_limit = PowerLimit()
        self.power_limit.forward = 0.5
        self.power_limit.rightward = 0.5
        self.power_limit.upward = 0.5
        self.power_limit.yaw = 0.5
        self.power_limit.pitch = 0.5
        self.power_limit.roll = 0.5
        
        self.last_log_time = time.time()
        self.log_interval = 1.0  # Log only once per second
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

    def send_commands(self):
        cmd_twist_movement = self.movement_output
        cmd_twist_gripper = self.gripper_output
        cmd_twist_sec_gripper = self.sec_gripper_output
        
        # Publish the joystick command
        self.joystick_cmd.publish(self.movement_output)
        self.gripper_cmd.publish(self.gripper_output)
        self.sec_gripper_cmd.publish(self.sec_gripper_output)

        try:
            self.get_logger().info(
                f'COMMAND - '
                f'MOVE - linear: (x: {cmd_twist_movement.linear.x:.2f}, y: {cmd_twist_movement.linear.y:.2f}, z: {cmd_twist_movement.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_movement.angular.x:.2f}, y: {cmd_twist_movement.angular.y:.2f}, z: {cmd_twist_movement.angular.z:.2f}) | '
                f'GRIPPER A - linear: (x: {cmd_twist_gripper.linear.x:.2f}, y: {cmd_twist_gripper.linear.y:.2f}, z: {cmd_twist_gripper.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_gripper.angular.x:.2f}, y: {cmd_twist_gripper.angular.y:.2f}, z: {cmd_twist_gripper.angular.z:.2f})'
                f'GRIPPER B - linear: (x: {cmd_twist_sec_gripper.linear.x:.2f}, y: {cmd_twist_sec_gripper.linear.y:.2f}, z: {cmd_twist_sec_gripper.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_sec_gripper.angular.x:.2f}, y: {cmd_twist_sec_gripper.angular.y:.2f}, z: {cmd_twist_sec_gripper.angular.z:.2f})'
            
            )
        except Exception:
            # Fallback to standard print if ROS logging fails
            print(
                f'COMMAND - '
                f'MOVEMENT - linear: (x: {cmd_twist_movement.linear.x:.2f}, y: {cmd_twist_movement.linear.y:.2f}, z: {cmd_twist_movement.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_movement.angular.x:.2f}, y: {cmd_twist_movement.angular.y:.2f}, z: {cmd_twist_movement.angular.z:.2f}) | '
                f'GRIPPER A - linear: (x: {cmd_twist_gripper.linear.x:.2f}, y: {cmd_twist_gripper.linear.y:.2f}, z: {cmd_twist_gripper.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_gripper.angular.x:.2f}, y: {cmd_twist_gripper.angular.y:.2f}, z: {cmd_twist_gripper.angular.z:.2f})'
                f'GRIPPER B - linear: (x: {cmd_twist_sec_gripper.linear.x:.2f}, y: {cmd_twist_sec_gripper.linear.y:.2f}, z: {cmd_twist_sec_gripper.linear.z:.2f}), '
                f'angular: (x: {cmd_twist_sec_gripper.angular.x:.2f}, y: {cmd_twist_sec_gripper.angular.y:.2f}, z: {cmd_twist_sec_gripper.angular.z:.2f})'
            )

    def read_joystick_command(self):
        while True:
            # The controller status is being monitored in the XboxController class
            is_connected = self.console.read_controller()
            
            if not is_connected:
                # Skip processing if disconnected (values already set to 0 in the controller class)
                time.sleep(0.1)
                continue

            # Read joystick values
            movement_cmd, gripper_cmd, sec_gripper_cmd = self.console.read()

            # Convert to float list
            full_movement_cmd = [float(i) for i in movement_cmd]

            # Log the raw joystick values
            # self.get_logger().info(f"Raw joystick values: {full_movement_cmd}")

            # Scale the joystick input from [-1, 1] to the specified power limits for each axis
            movement_cmd = [
                full_movement_cmd[0] * self.power_limit.yaw,          # lx -> yaw
                full_movement_cmd[1] * self.power_limit.forward,       # ly -> forward
                full_movement_cmd[2] * self.power_limit.rightward,     # rx -> rightward
                full_movement_cmd[3] * self.power_limit.upward,        # ry -> upward
                full_movement_cmd[4] * self.power_limit.roll,          # dx -> roll
                full_movement_cmd[5] * self.power_limit.pitch          # dy -> pitch
            ]

            # Set a threshold to zero out small values for linear.z and angular.z
            threshold = 0.15  # Define a threshold value
            movement_cmd_twist = Twist()
            movement_cmd_twist.linear.x      = movement_cmd[1] * -1   # left joystick y (forward/backward)
            movement_cmd_twist.linear.y      = movement_cmd[0] * -1 if abs(movement_cmd[0]) >= threshold else 0.0  # left joystick x (yaw)
            movement_cmd_twist.linear.z      = movement_cmd[3] * -1 if abs(movement_cmd[3]) >= threshold else 0.0  # right joystick y (up/down)
            movement_cmd_twist.angular.x     = movement_cmd[4] * -1   # d-pad x (roll)
            movement_cmd_twist.angular.y     = movement_cmd[5] * -1   # d-pad y (pitch)
            movement_cmd_twist.angular.z     = movement_cmd[2] * -1   # right joystick x (left/right)

            self.movement_output = movement_cmd_twist

            # Process gripper command
            gripper_cmd = [float(i) for i in gripper_cmd]
            gripper_cmd_twist = Twist()

            gripper_cmd_twist.linear.x      = gripper_cmd[0]        # left trigger
            gripper_cmd_twist.linear.y      = gripper_cmd[1]        # right trigger
            gripper_cmd_twist.linear.z      = gripper_cmd[2]        # button X
            gripper_cmd_twist.angular.z     = gripper_cmd[3]        # button A
            gripper_cmd_twist.angular.x     = gripper_cmd[4]        # button Y
            gripper_cmd_twist.angular.y     = gripper_cmd[5]        # button B
            self.gripper_output = gripper_cmd_twist
            
            # Process second gripper command
            sec_gripper_cmd = [float(i) for i in sec_gripper_cmd]
            sec_gripper_cmd_twist = Twist()
            
            sec_gripper_cmd_twist.linear.x      = sec_gripper_cmd[0]        # left bumper
            sec_gripper_cmd_twist.linear.y      = sec_gripper_cmd[1]        # right bumper
            sec_gripper_cmd_twist.linear.z      = sec_gripper_cmd[2]        # back button
            sec_gripper_cmd_twist.angular.z     = sec_gripper_cmd[3]        # start button
            sec_gripper_cmd_twist.angular.x     = sec_gripper_cmd[4]        # left trigger
            sec_gripper_cmd_twist.angular.y     = sec_gripper_cmd[5]        # right trigger
            self.sec_gripper_output = sec_gripper_cmd_twist

            # Small delay to prevent high CPU usage
            time.sleep(0.01)


def main(args=None):
    rclpy.init(args=args)
    node = ConsoleCommand()
    rclpy.spin(node)
    
    # Clean up pygame
    pygame.quit()
    rclpy.shutdown()

if __name__ == '__main__':
    main()