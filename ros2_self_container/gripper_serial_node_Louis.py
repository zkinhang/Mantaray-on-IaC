import rclpy
from rclpy.duration import Duration
from rclpy.node import Node
from geometry_msgs.msg import Twist


class GripperActuator(Node):
    def __init__(self):
        super().__init__('gripper_actuator')
        self.declare_parameter('command_topic', '/controller/gripper')
        self.declare_parameter('min_cmd_threshold', 0.05)
        self.declare_parameter('command_timeout_sec', 1.5)
        self.declare_parameter('enable_conflict_guard', True)

        self.command_topic = self.get_parameter('command_topic').value
        self.min_cmd_threshold = float(self.get_parameter('min_cmd_threshold').value)
        self.command_timeout_sec = float(self.get_parameter('command_timeout_sec').value)
        self.enable_conflict_guard = bool(self.get_parameter('enable_conflict_guard').value)

        self._last_command_time = self.get_clock().now()
        self._last_action = 'idle'

        # Subscribe to high-level gripper control commands.
        self.subscription = self.create_subscription(
            Twist,
            self.command_topic,
            self.listener_callback,
            10,
        )
        self.watchdog_timer = self.create_timer(0.2, self.watchdog_callback)

        self.get_logger().info(
            'Gripper actuator started on topic '
            f'{self.command_topic} | deadband={self.min_cmd_threshold} '
            f'| timeout={self.command_timeout_sec}s'
        )

    def listener_callback(self, msg: Twist) -> None:
        # Read control channels.
        open_cmd = msg.linear.x
        close_cmd = msg.linear.y
        up_cmd = msg.linear.z

        # Ignore tiny noise around zero.
        open_cmd = open_cmd if abs(open_cmd) >= self.min_cmd_threshold else 0.0
        close_cmd = close_cmd if abs(close_cmd) >= self.min_cmd_threshold else 0.0
        up_cmd = up_cmd if abs(up_cmd) >= self.min_cmd_threshold else 0.0
        down_cmd = down_cmd if abs(down_cmd) >= self.min_cmd_threshold else 0.0
        action_executed = False

        if self.enable_conflict_guard and open_cmd > 0 and close_cmd > 0:
            if open_cmd >= close_cmd:
                self.get_logger().warn(
                    'Conflict: open/close requested together, prioritizing OPEN'
                )
                close_cmd = 0.0
            else:
                self.get_logger().warn(
                    'Conflict: open/close requested together, prioritizing CLOSE'
                )
                open_cmd = 0.0

        # TODO: Replace logs with your low-level hardware driver calls.
        if open_cmd > 0:
            self.execute_open(open_cmd)
            action_executed = True
        elif close_cmd > 0:
            self.execute_close(close_cmd)
            action_executed = True

        if up_cmd > 0:
            self.execute_lift(up_cmd)
            action_executed = True

        if action_executed:
            self._last_command_time = self.get_clock().now()
        else:
            self._last_action = 'idle'

    def execute_open(self, force: float) -> None:
        self._last_action = 'open'
        self.get_logger().info(f'Execute: open gripper (force: {force:.3f})')

    def execute_close(self, force: float) -> None:
        self._last_action = 'close'
        self.get_logger().info(f'Execute: close gripper (force: {force:.3f})')

    def execute_lift(self, value: float) -> None:
        self._last_action = 'lift'
        self.get_logger().info(f'Execute: lift gripper (value: {value:.3f})')

    def watchdog_callback(self) -> None:
        if self._last_action == 'idle':
            return

        elapsed = self.get_clock().now() - self._last_command_time
        if elapsed > Duration(seconds=self.command_timeout_sec):
            self.get_logger().warn(
                f'No command for {self.command_timeout_sec:.2f}s, entering safe idle state'
            )
            self._last_action = 'idle'


def main(args=None) -> None:
    rclpy.init(args=args)
    node = GripperActuator()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
