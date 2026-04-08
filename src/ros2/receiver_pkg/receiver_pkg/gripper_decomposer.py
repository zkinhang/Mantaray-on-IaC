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
        self.declare_parameter('gripper_config.b_pwm_min', 550)
        self.declare_parameter('gripper_config.b_pwm_max', 2450)
        self.declare_parameter('gripper_config.c_pwm_min', 1700)
        self.declare_parameter('gripper_config.c_pwm_max', 2450)
        
        self.declare_parameter('gripper_config.a_pwm_step', 30)
        self.declare_parameter('gripper_config.b_pwm_step', 30)
        self.declare_parameter('gripper_config.c_pwm_step', 30)
        # Declare initial values as float arrays
        self.declare_parameter('gripper_config.initial_gripper_a_values', [1400.0, 1400.0, 1400.0])
        self.declare_parameter('gripper_config.initial_gripper_b_values', [1400.0, 1400.0, 1400.0])
        
        # Declare mapping arrays
        self.declare_parameter('gripper_config.gripper_a_mapping', [0, 1, 2])
        self.declare_parameter('gripper_config.gripper_b_mapping', [0, 1, 2])
        
        # Declare continuous servo mapping arrays (1 = continuous, 0 = standard)
        self.declare_parameter('gripper_config.gripper_a_continuous_mapping', [0, 0, 0])
        self.declare_parameter('gripper_config.gripper_b_continuous_mapping', [0, 0, 0])

        # Get parameter values from external
        self.dpad_power = self.get_parameter('gripper_config.dpad_power').get_parameter_value().double_value
        
        self.a_pwm_min = self.get_parameter('gripper_config.a_pwm_min').get_parameter_value().integer_value
        self.a_pwm_max = self.get_parameter('gripper_config.a_pwm_max').get_parameter_value().integer_value
        self.b_pwm_min  = self.get_parameter('gripper_config.b_pwm_min').get_parameter_value().integer_value
        self.b_pwm_max  = self.get_parameter('gripper_config.b_pwm_max').get_parameter_value().integer_value
        self.c_pwm_min  = self.get_parameter('gripper_config.c_pwm_min').get_parameter_value().integer_value
        self.c_pwm_max  = self.get_parameter('gripper_config.c_pwm_max').get_parameter_value().integer_value
        
        self.a_pwm_step = self.get_parameter('gripper_config.a_pwm_step').get_parameter_value().integer_value
        self.b_pwm_step = self.get_parameter('gripper_config.b_pwm_step').get_parameter_value().integer_value
        self.c_pwm_step = self.get_parameter('gripper_config.c_pwm_step').get_parameter_value().integer_value
        
        # Get initial values as lists of floats
        self.initial_a = self.get_parameter('gripper_config.initial_gripper_a_values').get_parameter_value().double_array_value
        self.initial_b = self.get_parameter('gripper_config.initial_gripper_b_values').get_parameter_value().double_array_value
        
        # Get mapping arrays
        self.mapping_a = self.get_parameter('gripper_config.gripper_a_mapping').get_parameter_value().integer_array_value
        self.mapping_b = self.get_parameter('gripper_config.gripper_b_mapping').get_parameter_value().integer_array_value
        
        # Get continuous servo mapping arrays
        self.continuous_a = self.get_parameter('gripper_config.gripper_a_continuous_mapping').get_parameter_value().integer_array_value
        self.continuous_b = self.get_parameter('gripper_config.gripper_b_continuous_mapping').get_parameter_value().integer_array_value

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
        # For continuous servos, start at neutral (mid PWM); for standard servos, use initial values
        self.gripper_values = self._initialize_servo_values(
            self.initial_a, self.continuous_a, 
            [self.a_pwm_min, self.b_pwm_min, self.c_pwm_min],
            [self.a_pwm_max, self.b_pwm_max, self.c_pwm_max]
        )
        self.sec_gripper_values = self._initialize_servo_values(
            self.initial_b, self.continuous_b,
            [self.a_pwm_min, self.b_pwm_min, self.c_pwm_min],
            [self.a_pwm_max, self.b_pwm_max, self.c_pwm_max]
        )

        self.get_logger().info(f"Gripper decomposer init done. DPAD Power: {self.dpad_power}, a_step: {self.a_pwm_step}")
        
    def _apply_mapping(self, values: list, mapping: list) -> list:
        # Create an output list sized to accommodate the max mapping index
        max_idx = max(mapping) if mapping else len(values) - 1
        mapped_values = [0.0] * (max_idx + 1)
        for i, val in enumerate(values):
            if i < len(mapping):
                mapped_values[mapping[i]] = val
        return mapped_values

    def _initialize_servo_values(self, initial_values: list, continuous_map: list, 
                                 pwm_mins: list, pwm_maxs: list) -> list:
        """
        Initialize servo values. Continuous servos start at neutral (mid PWM),
        standard servos use the provided initial values.
        """
        result = []
        for i, initial_val in enumerate(initial_values):
            if i < len(continuous_map) and continuous_map[i] == 1:
                # Continuous servo: initialize to neutral
                mid_pwm = (pwm_mins[i] + pwm_maxs[i]) / 2.0
                result.append(mid_pwm)
            else:
                # Standard servo: use initial value
                result.append(initial_val)
        return result

    def _is_continuous_servo(self, servo_index: int, is_gripper_b: bool) -> bool:
        """Check if a servo is configured as continuous."""
        continuous_map = self.continuous_b if is_gripper_b else self.continuous_a
        if servo_index < len(continuous_map):
            return continuous_map[servo_index] == 1
        return False

    def _set_continuous_servo_pwm(self, servo_index: int, direction: float, speed_percent: float, 
                                   pwm_min: float, pwm_max: float) -> float:
        """
        Calculate PWM value for continuous servo based on direction and speed percentage.
        
        For continuous servos:
        - Neutral (0 direction): Returns mid PWM
        - Forward (+1): Returns mid + (max-mid) * speed_ratio
        - Backward (-1): Returns mid - (mid-min) * speed_ratio
        
        Args:
            servo_index: Index of the servo
            direction: -1.0 (backward), 0.0 (neutral), or 1.0 (forward)
            speed_percent: Speed percentage (0-100, where 100 = full speed from neutral)
            pwm_min: Minimum PWM value
            pwm_max: Maximum PWM value
            
        Returns:
            Target PWM value for the continuous servo
        """
        mid_pwm = (pwm_min + pwm_max) / 2.0
        speed_ratio = speed_percent / 100.0
        speed_ratio = max(0.0, min(1.0, speed_ratio))  # Clamp between 0 and 1
        
        if direction > 0:
            # Forward: move toward max
            target_pwm = mid_pwm + (pwm_max - mid_pwm) * speed_ratio
        elif direction < 0:
            # Backward: move toward min
            target_pwm = mid_pwm - (mid_pwm - pwm_min) * speed_ratio
        else:
            # No input: neutral position
            target_pwm = mid_pwm
            
        return target_pwm

    def _update_servo_value(self, current_val: float, direction: float, step: float,
                           pwm_min: float, pwm_max: float, is_continuous: bool) -> float:
        """
        Update servo value based on whether it's continuous or standard.
        
        Args:
            current_val: Current PWM value
            direction: -1.0 (backward), 0.0 (neutral), or 1.0 (forward)
            step: Step value (as percentage for continuous, as PWM units for standard)
            pwm_min: Minimum PWM value
            pwm_max: Maximum PWM value
            is_continuous: Whether this is a continuous servo
            
        Returns:
            Updated PWM value
        """
        if is_continuous:
            return self._set_continuous_servo_pwm(0, direction, step, pwm_min, pwm_max)
        else:
            # Standard servo: use stepping logic
            if direction > 0:
                return min(current_val + step, pwm_max)
            elif direction < 0:
                return max(current_val - step, pwm_min)
            else:
                return current_val

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
        # Process a (linear.x and linear.y)
        is_a_continuous = self._is_continuous_servo(0, is_gripper_b=False)
        if msg.linear.x > 0 and msg.linear.y <= 0:
            direction = 1.0
        elif msg.linear.y > 0 and msg.linear.x <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.gripper_values[0] = self._update_servo_value(
            self.gripper_values[0], direction, self.a_pwm_step,
            self.a_pwm_min, self.a_pwm_max, is_a_continuous
        )
            
        # Process b (linear.z and angular.z)
        is_b_continuous = self._is_continuous_servo(1, is_gripper_b=False)
        if msg.linear.z > 0 and msg.angular.z <= 0:
            direction = 1.0
        elif msg.angular.z > 0 and msg.linear.z <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.gripper_values[1] = self._update_servo_value(
            self.gripper_values[1], direction, self.b_pwm_step,
            self.b_pwm_min, self.b_pwm_max, is_b_continuous
        )
            
        # Process c (angular.x and angular.y)
        is_c_continuous = self._is_continuous_servo(2, is_gripper_b=False)
        if msg.angular.x > 0 and msg.angular.y <= 0:
            direction = 1.0
        elif msg.angular.y > 0 and msg.angular.x <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.gripper_values[2] = self._update_servo_value(
            self.gripper_values[2], direction, self.c_pwm_step,
            self.c_pwm_min, self.c_pwm_max, is_c_continuous
        )

        # Publish the gripper values
        gripper_command = Float32MultiArray()
        # Apply configured pin mapping
        mapped_values = self._apply_mapping(self.gripper_values, self.mapping_a)
        gripper_command.data = [float(v) for v in mapped_values] # Ensure data is float
        self.gripper_publisher.publish(gripper_command)
        
        # Log continuous servo status in one line
        continuous_info = []
        for i in range(3):
            if self._is_continuous_servo(i, is_gripper_b=False):
                continuous_info.append(f"S{i}:{self.gripper_values[i]:.0f}")
        if continuous_info:
            self.get_logger().info(f"Gripper A continuous - {', '.join(continuous_info)} PWM")
        
    def sec_gripper_listener_callback(self, msg: Twist):
        # Process a (linear.x and linear.y)
        is_a_continuous = self._is_continuous_servo(0, is_gripper_b=True)
        if msg.linear.x > 0 and msg.linear.y <= 0:
            direction = 1.0
        elif msg.linear.y > 0 and msg.linear.x <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.sec_gripper_values[0] = self._update_servo_value(
            self.sec_gripper_values[0], direction, self.a_pwm_step,
            self.a_pwm_min, self.a_pwm_max, is_a_continuous
        )
            
        # Process b (linear.z and angular.z)
        is_b_continuous = self._is_continuous_servo(1, is_gripper_b=True)
        if msg.linear.z > 0 and msg.angular.z <= 0:
            direction = 1.0
        elif msg.angular.z > 0 and msg.linear.z <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.sec_gripper_values[1] = self._update_servo_value(
            self.sec_gripper_values[1], direction, self.b_pwm_step,
            self.b_pwm_min, self.b_pwm_max, is_b_continuous
        )
            
        # Process c (angular.x and angular.y)
        is_c_continuous = self._is_continuous_servo(2, is_gripper_b=True)
        if msg.angular.x > 0 and msg.angular.y <= 0:
            direction = 1.0
        elif msg.angular.y > 0 and msg.angular.x <= 0:
            direction = -1.0
        else:
            direction = 0.0
        self.sec_gripper_values[2] = self._update_servo_value(
            self.sec_gripper_values[2], direction, self.c_pwm_step,
            self.c_pwm_min, self.c_pwm_max, is_c_continuous
        )

        # Publish the sec_gripper values
        sec_gripper_command = Float32MultiArray()
        # Apply configured pin mapping
        mapped_sec_values = self._apply_mapping(self.sec_gripper_values, self.mapping_b)
        sec_gripper_command.data = [float(v) for v in mapped_sec_values] # Ensure data is float
        self.sec_gripper_publisher.publish(sec_gripper_command)
        
        # Log continuous servo status in one line
        continuous_info = []
        for i in range(3):
            if self._is_continuous_servo(i, is_gripper_b=True):
                continuous_info.append(f"S{i}:{self.sec_gripper_values[i]:.0f}")
        if continuous_info:
            self.get_logger().info(f"Gripper B continuous - {', '.join(continuous_info)} PWM")

def main(args=None):
    # ROS2 initialization
    rclpy.init(args=args)
    vector_publisher = command_decomposer()
    rclpy.spin(vector_publisher)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
