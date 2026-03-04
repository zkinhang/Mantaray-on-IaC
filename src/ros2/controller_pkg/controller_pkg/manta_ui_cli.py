import threading
import sys
import rclpy
from rclpy.node import Node
from custom_interfaces.msg import PowerLimit


class MantaUINodeCLI(Node):
    """Simple terminal UI node to publish `PowerLimit` messages.

    This lightweight CLI node accepts stdin commands to publish
    `PowerLimit` messages on `/power_limit`.
    """

    AXES = ["forward", "rightward", "upward", "roll", "pitch", "yaw"]

    def __init__(self):
        super().__init__("manta_ui_cli")
        self.pub = self.create_publisher(PowerLimit, "/power_limit", 10)
        self.get_logger().info("Manta UI CLI started — enter: <axis> <0.0..1.0> | list | quit")
        self._stop = threading.Event()

    def publish_limit(self, axis: str, value: float) -> None:
        if axis not in self.AXES:
            self.get_logger().error(f"Unknown axis: {axis}. Valid: {', '.join(self.AXES)}")
            return
        msg = PowerLimit()
        for a in self.AXES:
            setattr(msg, a, 0.0)
        setattr(msg, axis, float(value))
        self.pub.publish(msg)
        self.get_logger().info(f"Published PowerLimit: {axis} = {value}")

    def input_loop(self):
        try:
            while not self._stop.is_set():
                line = sys.stdin.readline()
                if not line:
                    break
                parts = line.strip().split()
                if not parts:
                    continue
                cmd = parts[0].lower()
                if cmd in ("quit", "exit"):
                    self.get_logger().info("Exiting manta_ui_cli")
                    self._stop.set()
                    rclpy.shutdown()
                    break
                if cmd == "list":
                    self.get_logger().info(f"Axes: {', '.join(self.AXES)}")
                    continue
                if len(parts) >= 2:
                    axis = parts[0]
                    try:
                        value = float(parts[1])
                    except ValueError:
                        self.get_logger().error("Value must be a number between 0.0 and 1.0")
                        continue
                    value = max(0.0, min(1.0, value))
                    self.publish_limit(axis, value)
                else:
                    self.get_logger().info("Usage: <axis> <0.0..1.0> | list | quit")
        except Exception as e:
            self.get_logger().error(f"Input loop error: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = MantaUINodeCLI()
    t = threading.Thread(target=node.input_loop, daemon=True)
    t.start()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node._stop.set()
        node.get_logger().info("Shutting down manta_ui_cli")
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
