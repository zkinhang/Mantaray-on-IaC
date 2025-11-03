import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import time


class MovementTestNode(Node):
    """Interactive ROS2 node for testing movement commands"""
    
    def __init__(self):
        super().__init__('movement_test_node')
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.gripper_pub = self.create_publisher(Twist, '/controller/gripper', 10)
        self.sec_gripper_pub = self.create_publisher(Twist, '/controller/sec_gripper', 10)
        
        # Default power limits (scaling factors)
        self.power_limit = {
            'forward': 0.5,
            'rightward': 0.5,
            'upward': 0.5,
            'yaw': 0.5,
            'pitch': 0.5,
            'roll': 0.5
        }
        
        self.get_logger().info('Movement Test Node initialized')
    
    def send_movement(self, linear_x=0.0, linear_y=0.0, linear_z=0.0,
                      angular_x=0.0, angular_y=0.0, angular_z=0.0, duration=1.0):
        """Send movement command for specified duration"""
        twist = Twist()
        twist.linear.x = linear_x
        twist.linear.y = linear_y
        twist.linear.z = linear_z
        twist.angular.x = angular_x
        twist.angular.y = angular_y
        twist.angular.z = angular_z
        
        start_time = time.time()
        while time.time() - start_time < duration:
            self.cmd_vel_pub.publish(twist)
            self.get_logger().info(
                f'Publishing movement: linear=({linear_x:.2f}, {linear_y:.2f}, {linear_z:.2f}), '
                f'angular=({angular_x:.2f}, {angular_y:.2f}, {angular_z:.2f})'
            )
            # time.sleep(0.1)
        
        # Stop movement
        self.stop_movement()
    
    def stop_movement(self):
        """Stop all movement"""
        twist = Twist()
        self.cmd_vel_pub.publish(twist)
        self.get_logger().info('Movement stopped')
    
    def send_gripper_command(self, gripper_cmd_list, gripper_type='primary', duration=1.0):
        """
        Send gripper command matching joystick_reader.py format
        
        Args:
            gripper_cmd_list: [Gopen, Gclose, Gup, Gdown, GantiClockwise, Gclockwise]
            gripper_type: 'primary' or 'secondary'
            duration: How long to send the command
        """
        gripper_cmd_twist = Twist()
        gripper_cmd_twist.linear.x = gripper_cmd_list[0]      # open
        gripper_cmd_twist.linear.y = gripper_cmd_list[1]      # close
        gripper_cmd_twist.linear.z = gripper_cmd_list[2]      # up
        gripper_cmd_twist.angular.z = gripper_cmd_list[3]     # down
        gripper_cmd_twist.angular.x = gripper_cmd_list[4]     # anticlockwise
        gripper_cmd_twist.angular.y = gripper_cmd_list[5]     # clockwise
        
        pub = self.gripper_pub if gripper_type == 'primary' else self.sec_gripper_pub
        
        start_time = time.time()
        while time.time() - start_time < duration:
            pub.publish(gripper_cmd_twist)
            self.get_logger().info(
                f'Publishing {gripper_type} gripper: '
                f'linear=({gripper_cmd_list[0]:.2f}, {gripper_cmd_list[1]:.2f}, {gripper_cmd_list[2]:.2f}), '
                f'angular=({gripper_cmd_list[4]:.2f}, {gripper_cmd_list[5]:.2f}, {gripper_cmd_list[3]:.2f})'
            )
            time.sleep(0.1)
        
        # Stop gripper
        gripper_cmd_twist_stop = Twist()
        pub.publish(gripper_cmd_twist_stop)
        self.get_logger().info(f'{gripper_type.capitalize()} gripper stopped')
    
    def interactive_test(self):
        """Interactive testing loop"""
        movements = {
            '1': ('Forward', {'linear_x': 0.5}),
            '2': ('Backward', {'linear_x': -0.5}),
            '3': ('Left (Yaw)', {'linear_y': 0.5}),
            '4': ('Right (Yaw)', {'linear_y': -0.5}),
            '5': ('Up', {'linear_z': 0.5}),
            '6': ('Down', {'linear_z': -0.5}),
            '7': ('Roll Left', {'angular_x': 0.5}),
            '8': ('Roll Right', {'angular_x': -0.5}),
            '9': ('Pitch Up', {'angular_y': 0.5}),
            '10': ('Pitch Down', {'angular_y': -0.5}),
            '11': ('Rotate Left', {'angular_z': 0.5}),
            '12': ('Rotate Right', {'angular_z': -0.5}),
        }
        
        while True:
            print("\n" + "="*50)
            print("Movement Test Node")
            print("="*50)
            print("Movement options:")
            for key, (name, _) in movements.items():
                print(f"  {key}. {name}")
            print("  20. Primary Gripper test")
            print("  21. Secondary Gripper test")
            print("  0. Exit")
            print("-"*50)
            
            choice = input("Select option (0-21): ").strip()
            
            if choice == '0':
                self.get_logger().info('Exiting...')
                break
            
            if choice == '20':
                self.gripper_interactive_test('primary')
                continue
            
            if choice == '21':
                self.gripper_interactive_test('secondary')
                continue
            
            if choice not in movements:
                print("Invalid choice")
                continue
            
            name, kwargs = movements[choice]
            try:
                duration = float(input(f"Duration for {name} (seconds): "))
                self.send_movement(**kwargs, duration=duration)
            except ValueError:
                print("Invalid duration. Please enter a number.")
    
    def gripper_interactive_test(self, gripper_type='primary'):
        """Gripper command testing"""
        gripper_actions = {
            '1': ('Open', [1.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
            '2': ('Close', [0.0, 1.0, 0.0, 0.0, 0.0, 0.0]),
            '3': ('Up', [0.0, 0.0, 1.0, 0.0, 0.0, 0.0]),
            '4': ('Down', [0.0, 0.0, 0.0, 1.0, 0.0, 0.0]),
            '5': ('Rotate Anticlockwise', [0.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
            '6': ('Rotate Clockwise', [0.0, 0.0, 0.0, 0.0, 0.0, 1.0]),
        }
        
        print(f"\n{gripper_type.capitalize()} Gripper Commands:")
        for key, (action, _) in gripper_actions.items():
            print(f"  {key}. {action}")
        print("  0. Back")
        
        choice = input("Select gripper command: ").strip()
        
        if choice == '0':
            return
        
        if choice not in gripper_actions:
            print("Invalid choice")
            return
        
        action, cmd_list = gripper_actions[choice]
        
        try:
            duration = float(input(f"Duration for {action} (seconds): "))
            self.send_gripper_command(cmd_list, gripper_type=gripper_type, duration=duration)
        except ValueError:
            print("Invalid duration. Please enter a number.")


def main(args=None):
    rclpy.init(args=args)
    node = MovementTestNode()
    
    try:
        node.interactive_test()
    except KeyboardInterrupt:
        node.get_logger().info('Interrupted')
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()