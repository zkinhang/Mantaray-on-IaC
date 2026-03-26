import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Joy
from std_msgs.msg import Int32MultiArray


class ROVArmController(Node):
    def __init__(self):
        super().__init__('arm_controller')

        # Publish command format: [channel, ID1, ID3, ID2]
        self.servo_pub = self.create_publisher(Int32MultiArray, 'servo_commands', 10)

        # Subscribe joystick input.
        self.joy_sub = self.create_subscription(Joy, 'joy', self.joy_callback, 10)

        self.rotation_val = 0
        self.pitch_val = 0
        self.claw_closed = False

        # Serial channel assignment.
        self.SERIAL_CHANNEL = 2

        self.get_logger().info(
            f'ROV Arm Controller - Serial {self.SERIAL_CHANNEL} Deployed (Quick Mode)'
        )

    def joy_callback(self, msg: Joy) -> None:
        """Handle joystick input and convert to arm command outputs."""
        rotation_in = msg.axes[0] * 100 if len(msg.axes) > 0 else 0
        pitch_in = msg.axes[1] * 100 if len(msg.axes) > 1 else 0
        claw_in = bool(msg.buttons[0]) if len(msg.buttons) > 0 else False

        self.rotation_val = int(rotation_in)
        self.pitch_val = int(pitch_in)
        self.claw_closed = claw_in

        self.update_and_publish(rotation_in, pitch_in, claw_in)

    def update_and_publish(self, rotation: float, pitch: float, claw: bool) -> None:
        """Apply differential mixing and publish via serial channel 2."""
        # Differential mixing: ID3(left)=R+P, ID2(right)=R-P
        s3_out = rotation + pitch
        s2_out = rotation - pitch
        s1_out = 100 if claw else 0

        def clamp(val: float) -> float:
            return max(-200, min(200, val))

        msg = Int32MultiArray()
        msg.data = [
            int(self.SERIAL_CHANNEL),
            int(s1_out),
            int(clamp(s3_out)),
            int(clamp(s2_out)),
        ]

        self.servo_pub.publish(msg)
        self.get_logger().info(
            f'Sent to Serial {self.SERIAL_CHANNEL}: {msg.data[1:]}'
        )


def main(args=None) -> None:
    rclpy.init(args=args)
    node = ROVArmController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
