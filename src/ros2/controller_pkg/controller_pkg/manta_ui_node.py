import rclpy
from rclpy.node import Node
from textual.app import App, ComposeResult
from textual.widgets import Header, Select, Static
from textual.containers import Horizontal
from custom_interfaces.msg import PowerLimit

"""Here is the Clean Textual UI node that publishes `PowerLimit` messages."""
class MantaRayUI(App):
    #This is used to operate the Textual UI to set and publish power limits.

    CSS = """
    .control-container { width: 100%; padding: 1; }
    .label { width: 15; content-align: center middle; }
    Select { width: 30; }
    """

    def __init__(self, node: Node):
        super().__init__()
        self.node = node

        # ROS publisher for PowerLimit messages
        self.set_power_pub = node.create_publisher(PowerLimit, '/controller/power_limit', 10)

        # Preset scales(Defined the value with others like Eec Faker)
        self.POWER_PRESETS = {
            "LOW": 0.3,
            "MEDIUM": 0.5,
            "HIGH": 0.7,
            "MAX": 1.0,
        }

        self.current_scale = 0.5
        self.current_axis = "all"

        # Initialize the message with default values
        self.power_limit_msg = PowerLimit()
        for axis in ['forward', 'rightward', 'upward', 'roll', 'pitch', 'yaw']:
            setattr(self.power_limit_msg, axis, 0.5)

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)

        with Horizontal(classes="control-container"):
            yield Static("POWER MODE:", classes="label")
            yield Select([(m, m) for m in self.POWER_PRESETS.keys()], id="power_mode_select", value="MEDIUM")

            yield Static("TARGET AXIS:", classes="label")
            yield Select(
                [
                    ("ALL AXES", "all"),
                    ("FORWARD", "forward"),
                    ("RIGHTWARD", "rightward"),
                    ("UPWARD", "upward"),
                    ("ROLL", "roll"),
                    ("PITCH", "pitch"),
                    ("YAW", "yaw"),
                ],
                id="axis_select",
                value="all",
            )

    def on_select_changed(self, event: Select.Changed) -> None:
        # Handle selection changes and publish new limits
        if event.select.id == "power_mode_select":
            self.current_scale = self.POWER_PRESETS.get(event.value, 0.5)
            self.node.get_logger().info(f"Power Level set to {event.value} ({self.current_scale})")
        elif event.select.id == "axis_select":
            self.current_axis = event.value
            self.node.get_logger().info(f"Targeting Axis: {event.value}")

        self.update_and_publish()

    def update_and_publish(self):
        # It is expected to apply scales towards the target axis or to all axes, then publish
        if self.current_axis == "all":
            for axis in ['forward', 'rightward', 'upward', 'roll', 'pitch', 'yaw']:
                setattr(self.power_limit_msg, axis, self.current_scale)
        else:
            if hasattr(self.power_limit_msg, self.current_axis):
                setattr(self.power_limit_msg, self.current_axis, self.current_scale)

        self.set_power_pub.publish(self.power_limit_msg)
        self.node.get_logger().debug(f"Published PowerLimit for axis: {self.current_axis}")


def main():
    rclpy.init()
    node = Node('manta_ui_node')
    app = MantaRayUI(node)
    try:
        app.run()
    except Exception as e:
        node.get_logger().error(f"Terminal runtime failure: {e}")
    finally:
        rclpy.shutdown() #Get rid of the ROS2 client library

#Operate the main function when this file is executed directly
if __name__ == "__main__":
    main()