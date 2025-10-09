import rclpy
from rclpy.node import Node
from rclpy.publisher import Publisher
from rclpy.subscription import Subscription
from std_msgs.msg import Float64, Bool
from geometry_msgs.msg import Twist, Vector3
from custom_interfaces.msg import ControlSystemStatus


class MessageConverter(Node):
    def __init__(self) -> None:
        super().__init__(node_name='message_converter')
        
        # Publishers for converted messages
        self.depth_publisher: Publisher = self.create_publisher(
            msg_type=Float64,
            topic='/system/depth',
            qos_profile=10
        )
        
        self.imu_publisher: Publisher = self.create_publisher(
            msg_type=Vector3,
            topic='/system/orientation',
            qos_profile=10
        )
        
        self.roll_publisher: Publisher = self.create_publisher(
            msg_type=Float64,
            topic='/system/roll',
            qos_profile=10
        )
        
        self.pitch_publisher: Publisher = self.create_publisher(
            msg_type=Float64,
            topic='/system/pitch',
            qos_profile=10
        )
        
        self.yaw_publisher: Publisher = self.create_publisher(
            msg_type=Float64,
            topic='/system/yaw',
            qos_profile=10
        )
        
        # self.in_progress_publisher: Publisher = self.create_publisher(
        #     msg_type=Bool,
        #     topic='/system/in_progress',
        #     qos_profile=10
        # )
        
        self.thruster_power_publisher: Publisher = self.create_publisher(
            msg_type=Twist,
            topic='/system/thruster_power',
            qos_profile=10
        )
        
        # Subscriptions
        self.control_status_subscription: Subscription = self.create_subscription(
            msg_type=ControlSystemStatus,
            topic='/control_system/status',
            callback=self.control_status_callback,
            qos_profile=10
        )
        
        self.cmd_vel_subscription: Subscription = self.create_subscription(
            msg_type=Twist,
            topic='/cmd_vel',
            callback=self.cmd_vel_callback,
            qos_profile=10
        )
        
        self.get_logger().info('Message Converter node has been initialized')
    
    def control_status_callback(self, msg: ControlSystemStatus) -> None:
        """Process the control system status message and republish data as standard ROS2 messages.
        
        Args:
            msg (ControlSystemStatus): The control system status message
        """
        # Publish depth as Float64
        depth_msg = Float64()
        depth_msg.data = msg.depth
        self.depth_publisher.publish(depth_msg)
        
        # Publish IMU data as Vector3
        self.imu_publisher.publish(msg.imu_data)
        
        # Extract roll, pitch, yaw from Vector3 and publish separately
        roll_msg = Float64()
        roll_msg.data = msg.imu_data.x
        self.roll_publisher.publish(roll_msg)
        
        pitch_msg = Float64()
        pitch_msg.data = msg.imu_data.y
        self.pitch_publisher.publish(pitch_msg)
        
        yaw_msg = Float64()
        yaw_msg.data = msg.imu_data.z
        self.yaw_publisher.publish(yaw_msg)
        
        # # Publish in_progress as Bool
        # in_progress_msg = Bool()
        # in_progress_msg.data = msg.in_progress
        # self.in_progress_publisher.publish(in_progress_msg)
        
        self.get_logger().debug(f'Converted and published control status: depth={msg.depth}, '
                               f'roll={msg.imu_data.x}, pitch={msg.imu_data.y}, yaw={msg.imu_data.z}, ')
    
    def cmd_vel_callback(self, msg: Twist) -> None:
        """Process the command velocity message and republish it as thruster power.
        
        Args:
            msg (Twist): The command velocity message
        """
        # Simply republish the Twist message to a different topic
        self.thruster_power_publisher.publish(msg)
        
        self.get_logger().debug(f'Republished cmd_vel as thruster_power: '
                               f'linear=({msg.linear.x}, {msg.linear.y}, {msg.linear.z}), '
                               f'angular=({msg.angular.x}, {msg.angular.y}, {msg.angular.z})')


def main(args=None):
    rclpy.init(args=args)
    msg_converter = MessageConverter()
    rclpy.spin(msg_converter)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
