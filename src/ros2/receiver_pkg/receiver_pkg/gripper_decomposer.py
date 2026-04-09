import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32MultiArray
from geometry_msgs.msg import Twist

class command_decomposer(Node):

    def __init__(self):
        super().__init__('command_decomposer')

        # Declare parameters with default values
        self.declare_parameter('gripper_config.dpad_power', 0.65)
        self.declare_parameter('gripper_config.a_pwm_min', 550)
        self.declare_parameter('gripper_config.a_pwm_max', 2450)
        self.declare_parameter('gripper_config.pwm_step', 30)
        self.declare_parameter('gripper_config.vertical_pwm_step', 12)
        self.declare_parameter('gripper_config.command_activation_threshold', 0.5)
        self.declare_parameter('gripper_config.b_pwm_min', 1000)
        self.declare_parameter('gripper_config.b_pwm_max', 2000)
        self.declare_parameter('gripper_config.c_pwm_min', 1000)
        self.declare_parameter('gripper_config.c_pwm_max', 2000)
        self.declare_parameter('gripper_config.servo3_rotation_scale', 1.0)
        self.declare_parameter('gripper_config.rotation_to_open_close_ratio', 4.0)
        self.declare_parameter('gripper_config.rotation_compensation_direction', -1.0)
        # Declare initial values as float arrays
        self.declare_parameter('gripper_config.initial_gripper_a_values', [1400.0, 1400.0, 1400.0])
        self.declare_parameter('gripper_config.initial_gripper_b_values', [1400.0, 1400.0, 1400.0])

        # Get parameter values from external
        self.dpad_power = self.get_parameter('gripper_config.dpad_power').get_parameter_value().double_value
        
        self.pwm_min_vertical = self.get_parameter('gripper_config.a_pwm_min').get_parameter_value().integer_value
        self.pwm_max_vertical = self.get_parameter('gripper_config.a_pwm_max').get_parameter_value().integer_value
        self.open_close_min = self.get_parameter('gripper_config.b_pwm_min').get_parameter_value().integer_value
        self.open_close_max = self.get_parameter('gripper_config.b_pwm_max').get_parameter_value().integer_value
        self.rotation_min = self.get_parameter('gripper_config.c_pwm_min').get_parameter_value().integer_value
        self.rotation_max = self.get_parameter('gripper_config.c_pwm_max').get_parameter_value().integer_value
        self.vertical_pwm_step = self.get_parameter('gripper_config.vertical_pwm_step').get_parameter_value().integer_value
        self.command_activation_threshold = self.get_parameter('gripper_config.command_activation_threshold').get_parameter_value().double_value
        self.servo3_rotation_scale = self.get_parameter('gripper_config.servo3_rotation_scale').get_parameter_value().double_value
        self.rotation_to_open_close_ratio = self.get_parameter('gripper_config.rotation_to_open_close_ratio').get_parameter_value().double_value
        self.rotation_compensation_direction = self.get_parameter('gripper_config.rotation_compensation_direction').get_parameter_value().double_value
        
        self.pwm_step = self.get_parameter('gripper_config.pwm_step').get_parameter_value().integer_value
        
        # Get initial values as lists of floats
        self.initial_a = self.get_parameter('gripper_config.initial_gripper_a_values').get_parameter_value().double_array_value
        self.initial_b = self.get_parameter('gripper_config.initial_gripper_b_values').get_parameter_value().double_array_value


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
        
        # Initialize gripper positions using parameters
        self.gripper_values = list(self.initial_a) # Use loaded initial values
        self.sec_gripper_values = list(self.initial_b)

        self.get_logger().info("Gripper decomposer init done. DPAD Power: {}, Step: {}".format(self.dpad_power, self.pwm_step))
        
    # map the dpad values to the coeffieient for calculating pwm values
    def read_dpad(self, value: float) -> float:
        if value == 0.0:
            return 0.0
        elif value == 1.0:
            return self.dpad_power
        elif value == -1.0:
            return -self.dpad_power
        else:
            return 0.0

    def gripper_listener_callback(self, msg: Twist):
        self._process_gripper_input(msg, self.gripper_values, self.gripper_publisher, "A")
        
    def sec_gripper_listener_callback(self, msg: Twist):
        self._process_gripper_input(msg, self.sec_gripper_values, self.sec_gripper_publisher, "B")

    def _process_gripper_input(self, msg: Twist, values, publisher, label: str):
        threshold = self.command_activation_threshold

        if msg.linear.x > threshold and msg.linear.y <= threshold:
            values[0] = min(values[0] + self.pwm_step, self.open_close_max)
        elif msg.linear.y > threshold and msg.linear.x <= threshold:
            values[0] = max(values[0] - self.pwm_step, self.open_close_min)

        if msg.linear.z > threshold and msg.angular.z <= threshold:
            values[1] = min(values[1] + self.vertical_pwm_step, self.pwm_max_vertical)
        elif msg.angular.z > threshold and msg.linear.z <= threshold:
            values[1] = max(values[1] - self.vertical_pwm_step, self.pwm_min_vertical)

        if msg.angular.x > threshold and msg.angular.y <= threshold:
            self._apply_rotation_with_compensation(values, rotation_sign=1)
        elif msg.angular.y > threshold and msg.angular.x <= threshold:
            self._apply_rotation_with_compensation(values, rotation_sign=-1)

        gripper_command = Float32MultiArray()
        gripper_command.data = [float(v) for v in values]
        publisher.publish(gripper_command)
        self.get_logger().info("gripper {} values: {}".format(label, values))

    def _apply_rotation_with_compensation(self, values, rotation_sign: int):
        """Apply servo-3 rotation and 4:1 default open/close compensation(from the acknowledgement of Nick gor)."""
        previous_rotation = values[2]
        servo3_step = int(round(self.pwm_step * self.servo3_rotation_scale))
        if servo3_step <= 0:
            return

        next_rotation = min(
            max(previous_rotation + (rotation_sign * servo3_step), self.rotation_min),
            self.rotation_max,
        )
        values[2] = next_rotation

        # Only compensate when rotation really moved to avoid drift at end stops.
        if next_rotation == previous_rotation:
            return

        ratio = self.rotation_to_open_close_ratio if self.rotation_to_open_close_ratio > 0 else 4.0
        actual_rotation_delta = next_rotation - previous_rotation
        compensation_step = max(1, int(round(abs(actual_rotation_delta) / ratio)))
        rotation_direction = 1 if actual_rotation_delta > 0 else -1
        compensation_sign = -1 if self.rotation_compensation_direction < 0 else 1
        values[0] = min(
            max(values[0] + (rotation_direction * compensation_sign * compensation_step), self.open_close_min),
            self.open_close_max,
        )

def main(args=None):
    # ROS2 initialization
    rclpy.init(args=args)
    vector_publisher = command_decomposer()
    rclpy.spin(vector_publisher)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
