# This is a node send the middle value of the twist message to topic "/pid/cmd_vel", to initalize the thrusters



import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import time


class ThrusterInitializer(Node):
    def __init__(self):
        super().__init__('thruster_initializer')
        self.publisher = self.create_publisher(Twist, '/pid/cmd_vel', 10)
        self.get_logger().info('Thruster initializer node started')
        
    def initialize_thrusters(self):
        # Create a Twist message with all zeros
        twist_msg = Twist()
        # Initialize value - can be modified as needed
        init_value = 0.0
        twist_msg.linear.x = init_value
        twist_msg.linear.y = init_value
        twist_msg.linear.z = init_value
        twist_msg.angular.x = init_value
        twist_msg.angular.y = init_value
        twist_msg.angular.z = init_value
        
        # Publish the zero message for 5 seconds
        start_time = time.time()
        while time.time() - start_time < 5.0:
            self.publisher.publish(twist_msg)
            self.get_logger().info('Publishing middle values to initialize thrusters')
            time.sleep(0.1)  # Publish at 10Hz
            
        self.get_logger().info('Thruster initialization complete')


def main(args=None):
    rclpy.init(args=args)
    
    initializer = ThrusterInitializer()
    initializer.initialize_thrusters()
    
    # Cleanup
    initializer.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
