#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from textual.app import App, ComposeResult
from textual.widgets import Button, Header, Input, Switch, Static, Select
from textual.containers import Grid, Horizontal
from std_msgs.msg import Bool, String, Float64, Empty # Import Empty
from custom_interfaces.msg import PowerLimit
from geometry_msgs.msg import Twist
from textual.binding import Binding

class UIAPP(App):
    BINDINGS = [
        Binding("w", "up", "Gripper up"),
        Binding("s", "down", "Gripper down"), 
        Binding("a", "turn_left", "Gripper left"),
        Binding("d", "turn_right", "Gripper right"),
        Binding("q", "open", "Gripper_open"),
        Binding("e", "close", "Gripper_close"),
        Binding("h", "capture_trigger", "Capture Images"), # Add binding for H key
    ]

    CSS = """
    Screen {
        align: center middle;
    }
    
    Grid {
        grid-size: 3;
        grid-gutter: 1;
        padding: 1;
        align: center middle;
        width: 80%;
    }
    
    Input {
        width: 80%;
        margin: 1;
        content-align: center middle;
        
    }
    
    Button {
        width: 100%;
        content-align: center middle;
        height: 100%;
    }
    
    .movement {
        background: #2980b9;
        color: white;
    }
    
    .action {
        background: #e74c3c;
        color: white;
    }
    
    Screen {
        align: center middle;
    }

    .container {
        content-align: center middle;
        height: auto;
        width: auto;
    }

    Switch {
        height: auto;
        width: auto;
        
    }

    .label {
        height: 2;
        content-align: center middle;
        width: auto;
    }
    
    Select {
        width: 30;
        margin: 1;
    }
    
    .submit-button {
        width: 30;
        margin: 1;
    }
    
    Header {
        content-align: center middle;
    }
    
    .power-container {
        width: 100%;
        height: auto;
    }
    
    #power_topic_select {
        width: 20;
    }

    .camera-container {
        width: 100%;
        height: auto;
        margin: 1;
    }

    .camera-button {
        background: #27ae60;
        color: white;
        width: 15;
    }
    
    .control-grid {
        grid-size: 4;
        grid-gutter: 1;
        padding: 1;
        width: 100%;
    }
    
    .control-input {
        width: 100%;
        height: auto;
    }
    
    .control-button {
        width: 100%;
        background: #3498db;
        color: white;
        height: auto;
    }
    
    .reserved-button {
        width: 100%; 
        background: #95a5a6;
        color: white;
    }
    """

    def __init__(self, node: Node):
        super().__init__()
        self.node = node
        self.set_power_pub = node.create_publisher(
            PowerLimit,
            '/controller/power_limit', 
            10
            )
        self.set_yaw_pub = node.create_publisher(Bool, 'set_current_yaw', 10)
        self.set_depth_pub = node.create_publisher(Bool, 'set_current_depth', 10)
        self.cmd_vel_pub = node.create_publisher(Twist, 'cmd_vel', 10)
        self.pid_toggle_pub = node.create_publisher(Bool, '/pid/toggle', 10)
        self.auto_position_pub = node.create_publisher(String, '/auto/cmd/position', 10)
        self.set_gripper_pub = node.create_publisher(Twist, '/controller/gripper', 10)
        # Add publisher for image capture trigger
        self.capture_trigger_pub = node.create_publisher(Empty, '/trigger_capture', 10)
        
        self.morse_pub = node.create_publisher(String, '/text_to_morse', 10)
        
        # auto setting
        self.variable_a = 0
        self.variable_b = 0
        self.variable_c = 0
        self.variable_d = 0  # Added variable_d support
        self.morse_msg = String()

        # power
        self.scale = 0.3
        self.power_topic = "all"  # Default power topic
        self.power_limit = PowerLimit()
        self.power_limit.forward = self.scale
        self.power_limit.rightward = self.scale
        self.power_limit.yaw = self.scale
        self.power_limit.upward = self.scale
        self.power_limit.roll = self.scale
        self.power_limit.pitch = self.scale

        # pid control
        self.pid_enabled = True
        
        # Auto position options
        self.auto_list = [
            "manual",
            "hold",
            'find_front',
            'find_bottom',
            "testing",
            "qualification",
            "task1"
        ]

    def compose(self) -> ComposeResult:
        yield Header()
        
        # Power limit input with topic selector
        with Horizontal(classes="power-container"):
            yield Input(
                placeholder="Enter power limit value (default: 0.5)", 
                id="scale_input",
                classes="power-input"
            )
            yield Select(
                [
                    ("all", "all"),
                    ("forward", "forward"),
                    ("rightward", "rightward"),
                    ("yaw", "yaw"),
                    ("upward", "upward"),
                    ("roll", "roll"),
                    ("pitch", "pitch")
                ],
                prompt="Topic",
                id="power_topic_select",
                value="all"
            )
            
        # 4x4 Control Grid
        with Grid(classes="control-grid"):
            yield Button("Turn Left (Q)", id="open", classes="movement")
            yield Button("Up (W)", id="up", classes="movement")
            yield Button("Turn Right (E)", id="close", classes="movement")
            yield Button("Left (A)", id="turn_left", classes="movement")
            yield Button("Down (S)", id="down", classes="movement")
            yield Button("Right (D)", id="turn_right", classes="movement")
                         
                         
            yield Input(
                placeholder="Set Point Pitch",
                id="pitch_input",
                value="0",
                classes="control-input"
            )
            yield Button("Set Pitch", id="set_pitch", classes="control-button")
            
            # Third row - Roll and reserved
            yield Input(
                placeholder="Set Point Roll",
                id="roll_input",
                value="0",
                classes="control-input"
            )
            yield Button("Set Roll", id="set_roll", classes="control-button")
            yield Input(
                placeholder="Reserved",
                id="reserved1_input",
                value="",
                classes="control-input"
            )
            yield Button("Reserved", id="reserved1_button", classes="reserved-button")
            
            # Fourth row - Stop and reserved
            yield Input(
                placeholder="Stop seconds",
                id="stop_seconds_input",
                value="0",
                classes="control-input"
            )
            yield Button("Stop", id="stop", classes="control-button")
            yield Input(
                placeholder="Reserved",
                id="reserved2_input",
                value="",
                classes="control-input"
            )
            yield Button("Reserved", id="reserved2_button", classes="reserved-button")
        # PID Control with toggle and Position select menu in a 1x2 grid
        with Grid(classes="bottom-controls", id="bottom_container"):
            # PID Control with toggle (left)
            with Horizontal(classes="container", id="pid_container"):
                yield Static("PID", classes="label")
                yield Switch(value=self.pid_enabled, id="toggle_pid")
            
            # Position select menu (right)
            yield Select(
                [(pos, pos) for pos in self.auto_list],
                prompt="Select Position",
                id="position_select",
                value=self.auto_list[0]  # Set default value to first option
            )
        with Horizontal(classes="power-container"):
            yield Input(
                placeholder="Type your message to morse code", 
                id="msg_input",
                classes="power-input"
            )
            yield Button("Submit", id="submit_button", classes="submit-button")

    def on_input_changed(self, event: Input.Changed) -> None:
        if event.input.id == "scale_input":
            try:
                self.scale = float(event.value)
                msg = Float64()
                msg.data = self.scale
                
                # Publish to the appropriate topic based on selection
                match self.power_topic:
                    case "all":
                        self.power_limit.forward = self.scale
                        self.power_limit.rightward = self.scale
                        self.power_limit.yaw = self.scale
                        self.power_limit.upward = self.scale
                        self.power_limit.roll = self.scale
                        self.power_limit.pitch = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "forward":
                        self.power_limit.forward = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "rightward":
                        self.power_limit.rightward = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "yaw":
                        self.power_limit.yaw = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "upward":
                        self.power_limit.upward = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "roll":
                        self.power_limit.roll = self.scale
                        self.set_power_pub.publish(self.power_limit)
                    case "pitch":
                        self.power_limit.pitch = self.scale
                        self.set_power_pub.publish(self.power_limit)
            except ValueError:
                self.scale = 0.5
        elif event.input.id == "camera1_input":
            try:
                self.variable_a = str(event.value)
            except ValueError:
                self.variable_a = 0
        elif event.input.id == "camera2_input":
            try:
                self.variable_b = str(event.value)
            except ValueError:
                self.variable_b = 0
        elif event.input.id == "msg_input":
            try:
                self.morse_msg.data = str(event.value)
            except ValueError:
                self.morse_msg.data = ""

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "auto_position_input" and event.value:
            msg = String()
            msg.data = event.value
            self.auto_position_pub.publish(msg)
            event.input.value = ""

    def on_select_changed(self, event: Select.Changed) -> None:
        if event.select.id == "position_select":
            msg = String()
            msg.data = f"{event.value} {self.variable_a} {self.variable_b} {self.variable_c} {self.variable_d}"
            self.auto_position_pub.publish(msg)
        elif event.select.id == "power_topic_select":
            self.power_topic = event.value
            # Update the power limit for the selected direction
            
            match self.power_topic:
                case "forward":
                    self.power_limit.forward = self.scale
                case "rightward":
                    self.power_limit.rightward = self.scale
                case "yaw":
                    self.power_limit.yaw = self.scale
                case "upward":
                    self.power_limit.upward = self.scale
                case "roll":
                    self.power_limit.roll = self.scale
                case "pitch":
                    self.power_limit.pitch = self.scale
                case "all":
                    self.power_limit.forward = self.scale
                    self.power_limit.rightward = self.scale
                    self.power_limit.yaw = self.scale
                    self.power_limit.upward = self.scale
                    self.power_limit.roll = self.scale
                    self.power_limit.pitch = self.scale
            
            # Publish to the single power limit topic
            self.set_power_pub.publish(self.power_limit)

    def action_stop(self) -> None:
        msg = Twist()
        self.cmd_vel_pub.publish(msg)

    def on_switch_changed(self, event: Switch.Changed) -> None:
        msg = Bool()
        msg.data = event.value
        if event.switch.id == "toggle_pid":
            self.pid_enabled = event.value
            self.pid_toggle_pub.publish(msg)


    def action_up(self) -> None:
        msg = Twist()
        msg.linear.x = 1.0
        self.set_gripper_pub.publish(msg)

    def action_down(self) -> None:
        msg = Twist()
        msg.linear.y = 1.0
        self.set_gripper_pub.publish(msg)

    def action_turn_left(self) -> None:
        msg = Twist()
        msg.linear.z = 1.0
        self.set_gripper_pub.publish(msg)

    def action_turn_right(self) -> None:
        msg = Twist()
        msg.angular.z = 1.0
        self.set_gripper_pub.publish(msg)

    def action_open(self) -> None:
        msg = Twist()
        msg.angular.x = 1.0
        self.set_gripper_pub.publish(msg)

    def action_close(self) -> None:
        msg = Twist()
        msg.angular.y = 1.0
        self.set_gripper_pub.publish(msg)

    def action_submit(self) -> None:
        self.morse_pub.publish(self.morse_msg)

    # Add action method for the capture trigger
    def action_capture_trigger(self) -> None:
        """Publishes an Empty message to trigger image capture."""
        msg = Empty()
        self.capture_trigger_pub.publish(msg)
        self.node.get_logger().info("Published capture trigger (H key)")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "up":
            self.action_up()
        elif event.button.id == "down":
            self.action_down()
        elif event.button.id == "turn_left":
            self.action_turn_left()
        elif event.button.id == "turn_right":
            self.action_turn_right()
        elif event.button.id == "open":
            self.action_open()
        elif event.button.id == "close":
            self.action_close()
        elif event.button.id == "submit_button":
            self.action_submit()


def main():
    rclpy.init()
    node = Node('ui_node')
    app = UIAPP(node)
    app.run()
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
