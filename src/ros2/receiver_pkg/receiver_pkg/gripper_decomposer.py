# this node decompose the command from the controller to the six vector for the vehicle
# pack the vectors in Float32MultiArray and publish to the topic "/receiver/vector",
# structure of the vector: [forwardInput, rightwardInput, upwardInput, yawInput, pitchInput, rollInput]
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32MultiArray
from geometry_msgs.msg import Twist

dpad_power = 0.65  # the power of dpad input

# todo: circular servo for linear.z (middle one) to rotate
# todo: pressure sensor data collect


class command_decomposer(Node):

    def __init__(self):
        super().__init__('command_decomposer')
        self.gripper_subscriber = self.create_subscription(
            Twist, 
            '/controller/gripper', 
            self.gripper_listener_callback, 
            10)
        self.sec_gripper_subscriber = self.create_subscription(
            Twist, 
            '/controller/sec_gripper', 
            self.sec_gripper_listener_callback, 
            10)
        
        self.gripper_publisher = self.create_publisher(
            Float32MultiArray, 
            '/receiver/gripper', 
            10)
        self.sec_gripper_publisher = self.create_publisher(
            Float32MultiArray, 
            '/receiver/sec_gripper', 
            10)
        
        # Initialize gripper positions (start at middle position)
        self.gripper_values = [1400, 1400, 1400]  # [open/close, up/down, rotation]
        self.sec_gripper_values = [1400, 1400, 1400]
        
        self.pwm_min = 550
        self.pwm_max = 2450
        self.pwm_step = 30  # Amount to change per update
        self.get_logger().info(f"Gripper decomposer initalization done: waiting for Twist messages")
        
        self.edit_pwm_min = 1000
        self.edit_pwm_max = 2000
        
        self.small_pwm_min = 1700
        self.small_pwm_max = 2450
        
    # map the dpad values to the coeffieient for calculating pwm values
    def read_dpad(self, value: float) -> float:
        if value == 0.0:
            return 0.0
        elif value == 1.0:
            return dpad_power
        elif value == -1.0:
            return -dpad_power
        else:
            return 0.0

    def gripper_listener_callback(self, msg: Twist):
        # Process open/close (linear.x and linear.y)
        if msg.linear.x > 0 and msg.linear.y <= 0:  # Open
            self.gripper_values[0] = min(self.gripper_values[0] + self.pwm_step, self.edit_pwm_max)
        elif msg.linear.y > 0 and msg.linear.x <= 0:  # Close
            self.gripper_values[0] = max(self.gripper_values[0] - self.pwm_step, self.edit_pwm_min)
        # Process up/down (linear.z and angular.z)
        if msg.linear.z > 0 and msg.angular.z <= 0:  # Up
            self.gripper_values[1] = min(self.gripper_values[1] + self.pwm_step, self.pwm_max)
        elif msg.angular.z > 0 and msg.linear.z <= 0:  # Down
            self.gripper_values[1] = max(self.gripper_values[1] - self.pwm_step, self.pwm_min)
        # Process rotation (angular.x and angular.y)
        if msg.angular.x > 0 and msg.angular.y <= 0:  # Rotate CCW
            self.gripper_values[2] = min(self.gripper_values[2] + self.pwm_step, self.small_pwm_max)
        elif msg.angular.y > 0 and msg.angular.x <= 0:  # Rotate CW
            self.gripper_values[2] = max(self.gripper_values[2] - self.pwm_step, self.small_pwm_min)
        # Publish the gripper values
        gripper_command = Float32MultiArray()
        gripper_command.data = self.gripper_values
        self.gripper_publisher.publish(gripper_command)
        self.get_logger().info(f"gripper A values: {self.gripper_values}")
        
    def sec_gripper_listener_callback(self, msg: Twist):
        # Process open/close (linear.x and linear.y)
        if msg.linear.x > 0 and msg.linear.y <= 0:
            self.sec_gripper_values[0] = min(self.sec_gripper_values[0] + self.pwm_step, self.edit_pwm_max)
        elif msg.linear.y > 0 and msg.linear.x <= 0:
            self.sec_gripper_values[0] = max(self.sec_gripper_values[0] - self.pwm_step, self.edit_pwm_min)
        # Process up/down (linear.z and angular.z)      
        if msg.linear.z > 0 and msg.angular.z <= 0:
            self.sec_gripper_values[1] = min(self.sec_gripper_values[1] + self.pwm_step, self.pwm_max)
        elif msg.angular.z > 0 and msg.linear.z <= 0:
            self.sec_gripper_values[1] = max(self.sec_gripper_values[1] - self.pwm_step, self.pwm_min)
        # Process rotation (angular.x and angular.y)
        if msg.angular.x > 0 and msg.angular.y <= 0:
            self.sec_gripper_values[2] = min(self.sec_gripper_values[2] + self.pwm_step, self.small_pwm_max)
        elif msg.angular.y > 0 and msg.angular.x <= 0:
            self.sec_gripper_values[2] = max(self.sec_gripper_values[2] - self.pwm_step, self.small_pwm_min)
        # Publish the gripper values
        gripper_command = Float32MultiArray()
        gripper_command.data = self.sec_gripper_values
        self.sec_gripper_publisher.publish(gripper_command)
        self.get_logger().info(f"gripper B values: {self.sec_gripper_values}")

def main(args=None):
    # ROS2 initialization
    rclpy.init(args=args)
    vector_publisher = command_decomposer()
    rclpy.spin(vector_publisher)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
