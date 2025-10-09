import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class PwmSubscriber(Node):

    def __init__(self):
        super().__init__('microros_debug')
        self.subscription = self.create_subscription(
            String,
            '/microros/written_pwm',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg):
        self.get_logger().info('I heard: "%s"' % msg.data)

def main(args=None):
    rclpy.init(args=args)
    pwm_subscriber = PwmSubscriber()
    rclpy.spin(pwm_subscriber)
    pwm_subscriber.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()