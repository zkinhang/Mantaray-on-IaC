import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import time

class ThrusterController(Node):
    def __init__(self):
        super().__init__('thruster_controller')
        self.publisher_ = self.create_publisher(Twist, '/controller/console', 10)
        self.timer = self.create_timer(0.02, self.timer_callback)
        self.start_time = time.time()
        self.state = 0

    def timer_callback(self):
        msg = Twist()
        current_time = time.time()
        elapsed_time = current_time - self.start_time

        if self.state == 0:
            self.get_logger().info('Moving forward for 3 seconds')
            msg.linear.y = -1.0  # Forward
            if elapsed_time > 3:
                self.state = 1
                self.start_time = current_time

        elif self.state == 1:
            self.get_logger().info('Yawing left for 2 seconds')
            msg.linear.z = 1.0  # Yaw left
            if elapsed_time > 2:
                self.state = 2
                self.start_time = current_time

        elif self.state == 2:
            self.get_logger().info('Moving forward for 3 seconds')
            msg.linear.y = -1.0  # Forward
            if elapsed_time > 3:
                self.state = 3
                self.start_time = current_time

        elif self.state == 3:
            self.get_logger().info('Stopping thrusters')
            msg.linear.x = 0.0
            msg.linear.y = 0.0
            msg.linear.z = 0.0
            msg.angular.x = 0.0
            msg.angular.y = 0.0
            msg.angular.z = 0.0
            if elapsed_time > 1:
                self.state = 0
                self.start_time = current_time

        self.publisher_.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = ThrusterController()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()