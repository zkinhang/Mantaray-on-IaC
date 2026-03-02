import rclpy
from rclpy.node import Node
from rclpy.publisher import Publisher
from rclpy.subscription import Subscription
from std_msgs.msg import Bool, Float64MultiArray, Float64
from sensor_msgs.msg import Imu
from geometry_msgs.msg import Twist, Vector3, Pose2D
from custom_interfaces.msg import ThrusterBoardStatus, ControlSystemStatus, VisionSystem
from thrusterboard_pkg.Configuration import ThrusterBoardInfo
from time import time
from simple_pid import PID
import numpy as np


class pid_system(Node):
    def __init__(self) -> None:
        super().__init__(node_name='pid_system')
        
        # Declare parameters
        self.declare_parameter('sample_time_sec', 0.05)
        self.declare_parameter('step_time_sec', 0.3)
        
        self.declare_parameter('pitch.kp', 1.0)
        self.declare_parameter('pitch.ki', 0.05)
        self.declare_parameter('pitch.kd', 1.0)
        self.declare_parameter('pitch.setpoint', 0.0)
        self.declare_parameter('pitch.output_limits', [-20.0, 20.0])

        self.declare_parameter('yaw.kp', 0.7)
        self.declare_parameter('yaw.ki', 0.01)
        self.declare_parameter('yaw.kd', 0.1)
        self.declare_parameter('yaw.setpoint', 0.0)
        self.declare_parameter('yaw.output_limits', [0.0, 0.0])

        self.declare_parameter('roll.kp', 5.0)
        self.declare_parameter('roll.ki', 0.0)
        self.declare_parameter('roll.kd', 1.0)
        self.declare_parameter('roll.setpoint', 0.0)
        self.declare_parameter('roll.output_limits', [-5.0, 5.0])

        self.declare_parameter('depth.kp', 0.45)
        self.declare_parameter('depth.ki', 0.008)
        self.declare_parameter('depth.kd', 7.5)
        self.declare_parameter('depth.output_limits', [0.0, 50.0])

        # Get parameter values
        sample_time = self.get_parameter('sample_time_sec').get_parameter_value().double_value
        self.stepTime = self.get_parameter('step_time_sec').get_parameter_value().double_value

        pitch_kp = self.get_parameter('pitch.kp').get_parameter_value().double_value
        pitch_ki = self.get_parameter('pitch.ki').get_parameter_value().double_value
        pitch_kd = self.get_parameter('pitch.kd').get_parameter_value().double_value
        pitch_setpoint = self.get_parameter('pitch.setpoint').get_parameter_value().double_value
        pitch_limits = self.get_parameter('pitch.output_limits').get_parameter_value().double_array_value

        yaw_kp = self.get_parameter('yaw.kp').get_parameter_value().double_value
        yaw_ki = self.get_parameter('yaw.ki').get_parameter_value().double_value
        yaw_kd = self.get_parameter('yaw.kd').get_parameter_value().double_value
        yaw_setpoint = self.get_parameter('yaw.setpoint').get_parameter_value().double_value
        yaw_limits = self.get_parameter('yaw.output_limits').get_parameter_value().double_array_value

        roll_kp = self.get_parameter('roll.kp').get_parameter_value().double_value
        roll_ki = self.get_parameter('roll.ki').get_parameter_value().double_value
        roll_kd = self.get_parameter('roll.kd').get_parameter_value().double_value
        roll_setpoint = self.get_parameter('roll.setpoint').get_parameter_value().double_value
        roll_limits = self.get_parameter('roll.output_limits').get_parameter_value().double_array_value

        depth_kp = self.get_parameter('depth.kp').get_parameter_value().double_value
        depth_ki = self.get_parameter('depth.ki').get_parameter_value().double_value
        depth_kd = self.get_parameter('depth.kd').get_parameter_value().double_value
        depth_limits = self.get_parameter('depth.output_limits').get_parameter_value().double_array_value

        # PID Controllers Initialization
        self.pitch_pid = PID(Kp=pitch_kp, Ki=pitch_ki, Kd=pitch_kd, setpoint=pitch_setpoint, sample_time=sample_time)  # Pitch angle PID
        self.pitch_pid.output_limits = (pitch_limits[0], pitch_limits[1])  # Output limits for pitch PID

        self.yaw_pid = PID(Kp=yaw_kp, Ki=yaw_ki, Kd=yaw_kd, setpoint=yaw_setpoint, sample_time=sample_time)  # Yaw angle PID
        self.yaw_pid.output_limits = (yaw_limits[0], yaw_limits[1])  # Output limits for yaw PID

        # Setpoints for control
        self.setpoint = None
        self.mag_setpoint = None
        self.acc_setpoint = None

        self.roll_pid = PID(Kp=roll_kp, Ki=roll_ki, Kd=roll_kd, setpoint=roll_setpoint, sample_time=sample_time)  # Roll angle PID
        self.roll_pid.output_limits = (roll_limits[0], roll_limits[1])  # Output limits for roll PID

        self.depth_pid = PID(Kp=depth_kp, Ki=depth_ki, Kd=depth_kd, setpoint=None, sample_time=sample_time)  # Depth PID
        self.depth_pid.output_limits = (depth_limits[0], depth_limits[1])  # Output limits for depth PID

        # Positional Data
        self.imu_update_time = time()
        # Timer
        self.timer = self.create_timer(timer_period_sec=sample_time, callback=self.timer_callback)
        self.stopTimer = None
        # self.stepTime configured via parameters above
        # Publisher
        self.publishers_cmd: Publisher = self.create_publisher(
            msg_type=Twist,
            topic='/pid/cmd_vel',
            qos_profile=10)  # pid output
        self.publishers_status: Publisher = self.create_publisher(
            msg_type=ControlSystemStatus,
            topic='/control_system/status',
            qos_profile=10
        )
        # Subscriptions
        self.subscriptions_vision_compass_enable: Subscription = self.create_subscription(
            msg_type=Bool,
            topic='/compass/enable',
            callback=self.compass_enable_callback,
            qos_profile=10)
        self.subscriptions_vision_too_close_enable: Subscription = self.create_subscription(
            msg_type=Bool,
            topic='/vision_system/too_close_enable',
            callback=self.vision_too_close_enable_callback,
            qos_profile=10)
        self.subscriptions_vision: Subscription = self.create_subscription(
            msg_type=VisionSystem,
            topic='/vision_system',
            callback=self.vision_callback,
            qos_profile=10)
        self.subscriptions_set_current_yaw: Subscription = self.create_subscription(
            msg_type=Bool,
            topic='/set_current_yaw',
            callback=self.set_current_yaw_callback,
            qos_profile=10)
        self.subscriptions_set_current_depth: Subscription = self.create_subscription(
            msg_type=Bool,
            topic='/set_current_depth',
            callback=self.set_current_depth_callback,
            qos_profile=10)
        self.current_yaw = 0.0

        self.subscriptions_setpoint_yaw: Subscription = self.create_subscription(
            msg_type=Float64,
            topic='/setpoint/yaw',
            callback=self.setpoint_yaw_callback,
            qos_profile=10)
        self.subscriptions_setpoint_depth: Subscription = self.create_subscription(
            msg_type=Float64,
            topic='/setpoint/depth',
            callback=self.setpoint_depth_callback,
            qos_profile=10)
        self.subscriptions_depth: Subscription = self.create_subscription(
            msg_type=ThrusterBoardStatus,
            topic='/thruster/status',
            callback=self.thruster_status_callback,
            qos_profile=10)
        self.subscriptions_pitch_pid: Subscription = self.create_subscription(
            msg_type=Float64MultiArray,
            topic='/pid/pitch',
            callback=self.pid_pitch_callback,
            qos_profile=10)
        self.subscriptions_yaw_pid: Subscription = self.create_subscription(
            msg_type=Float64MultiArray,
            topic='/pid/yaw',
            callback=self.pid_yaw_callback,
            qos_profile=10)
        self.subscriptions_roll_pid: Subscription = self.create_subscription(
            msg_type=Float64MultiArray,
            topic='/pid/roll',
            callback=self.pid_roll_callback,
            qos_profile=10)
        self.subscriptions_depth_pid: Subscription = self.create_subscription(
            msg_type=Float64MultiArray,
            topic='/pid/depth',
            callback=self.pid_depth_callback,
            qos_profile=10)
        self.subscriptions_pid_toggle: Subscription = self.create_subscription(
            msg_type=Bool, 
            topic='/pid/toggle', 
            callback=self.pid_toggle_callback, 
            qos_profile=10)
        self.cmd_subscriber: Subscription = self.create_subscription(
            msg_type=Twist, 
            topic='/cmd_vel', 
            callback=self.cmd_listener_callback, 
            qos_profile=10)  # keyboard input
        self.subscriptions_imu_acc: Subscription = self.create_subscription(
            msg_type=Imu,
            topic='/imu',
            callback=self.imu_acc_callback,
            qos_profile=10)
        self.subscriptions_mag: Subscription = self.create_subscription(
            msg_type=Vector3,
            topic='/magnetic',
            callback=self.magnetic_callback,
            qos_profile=10)

        self.subscriptions_mag_pose_2d: Subscription = self.create_subscription(
            msg_type=Pose2D,
            topic='/mag_pose_2d',
            callback=self.magnetic_pose_2d_callback,
            qos_profile=10)
        self.subscriptions_imu: Subscription = self.create_subscription(
            msg_type=Vector3,
            topic='/euler_angles',
            callback=self.imu_callback,
            qos_profile=10)

        # parameters
        self.xyz_out = Twist()
        self.compass_enable = True
        self.heading = 0.0
        self.heading_acc = 0.0
        
        self.heading_log = []  # log heading, if the heading is stable, reset the acc_setpoint
        self.heading_std = 0.0
        
        self.thrusterboardInfo : ThrusterBoardInfo | None = None
        self.roll_pitch_yaw : Vector3 | None = None
        self.roll_pitch_yaw_log : list[Vector3] = []
        self.user_input = Twist()
        self.output = Twist()

        # Vision Parameters
        self.too_close_enable = False
        self.vision_data = VisionSystem()

        # self.pid_toggle_callback(Bool(data=False))

    def timer_callback(self) -> None:
        self.output.angular.x = self.user_input.angular.x
        self.output.angular.y = self.user_input.angular.y
        self.output.angular.z = self.user_input.angular.z
        self.output.linear.x = self.user_input.linear.x
        self.output.linear.y = self.user_input.linear.y
        self.output.linear.z = self.user_input.linear.z
        if self.roll_pitch_yaw is None or self.thrusterboardInfo is None :#or (0 < self.roll_pitch_yaw.x < 40) or  (320 < self.roll_pitch_yaw.x < 360):
            self.get_logger().info("Waiting")
            self.publishers_cmd.publish(msg=Twist())
            return

        roll = self.roll_pitch_yaw.x
        pitch = self.roll_pitch_yaw.y
        yaw = self.roll_pitch_yaw.z
        if self.output.linear.z != 0 or self.output.angular.y !=0:
            self.depth_pid.setpoint = None
        if self.output.angular.z != 0:
            # self.yaw_pid.setpoint = None
            self.setpoint = None

        # if self.output.linear.x == 0 and self.output.linear.y == 0:
        # pitch_
 
        if self.pitch_pid.auto_mode and (-0.1 < self.user_input.angular.y < 0.1):
            power = self.pitch_pid(pitch) / 100
            self.output.angular.y = -power
        # #yaw
        # if self.yaw_pid.setpoint is None:
        #     self.yaw_pid.setpoint = yaw
        if self.setpoint is None:
            # self.setpoint = yaw
            self.set_current_yaw_callback(Bool(data=True))
            self.yaw_pid.reset()
        else:
            if self.yaw_pid.auto_mode:
                power = self.yaw_pid(-self.yaw_error_calculation()) / 100
                self.output.angular.z = float(-power)
        # # roll
        if self.roll_pid.auto_mode and (-0.1 < self.user_input.angular.x < 0.1):
            power = self.roll_pid(roll) / 100
            self.output.angular.x = -power
        # depth
        if self.depth_pid.setpoint is None:
            if self.thrusterboardInfo.depth != 0:
                self.depth_pid.setpoint = self.thrusterboardInfo.depth
                self.depth_pid.reset()
        elif self.depth_pid.auto_mode:
            power = self.depth_pid(self.thrusterboardInfo.depth) / 100
            self.output.linear.z = float(-power)
        
             
        
        # organize later
        # pitch compensation
        x = self.output.linear.x
        z = self.output.linear.z
        theta = np.arctan2(z, x)
        theta = np.rad2deg(theta)
        R = np.sqrt(x**2 + z**2)

        compensated_x = R * np.cos(np.deg2rad(theta - pitch))
        compensated_z = R * np.sin(np.deg2rad(theta - pitch))

        self.output.linear.x = compensated_x
        self.output.linear.z = compensated_z

        # self.output.linear.y max is 0.3 to -0.3
        if self.output.linear.y > 0.3:
            self.output.linear.y = 0.3
        elif self.output.linear.y < -0.3:
            self.output.linear.y = -0.3

        # # id depth_array [3,4,5] > 80 then stop x motion
        # if self.vision_data.depth_array is not None and self.too_close_enable:
        #     print(self.vision_data.depth_array)
        #     arr = list(self.vision_data.depth_array)
        #     too_close = 100
        #     # for item 5 - 9, if any consecutive 2 items are too close, stop x motion
        #     for i in range(5, 9):
        #         if arr[i] > too_close and arr[i+1] > too_close:
        #             if self.output.linear.x > 0.0:
        #                 self.output.linear.x = 0.0
        #             break
        # dampen the x, y, z movement
        ratio = 0.25
        if self.output.linear.x != self.xyz_out.linear.x:
            self.xyz_out.linear.x += (self.output.linear.x - self.xyz_out.linear.x) * ratio
            self.output.linear.x = self.xyz_out.linear.x
        if self.output.linear.y != self.xyz_out.linear.y:
            self.xyz_out.linear.y += (self.output.linear.y - self.xyz_out.linear.y) * ratio
            self.output.linear.y = self.xyz_out.linear.y
        if self.output.linear.z != self.xyz_out.linear.z:
            self.xyz_out.linear.z += (self.output.linear.z - self.xyz_out.linear.z) * ratio
            self.output.linear.z = self.xyz_out.linear.z
        
        if self.output.angular.x != self.xyz_out.angular.x:
            self.xyz_out.angular.x += (self.output.angular.x - self.xyz_out.angular.x) * ratio
            self.output.angular.x = self.xyz_out.angular.x
        if self.output.angular.y != self.xyz_out.angular.y:
            self.xyz_out.angular.y += (self.output.angular.y - self.xyz_out.angular.y) * ratio
            self.output.angular.y = self.xyz_out.angular.y
  
        if self.output.angular.z != self.xyz_out.angular.z:
            self.xyz_out.angular.z += (self.output.angular.z - self.xyz_out.angular.z) * ratio
            self.output.angular.z = self.xyz_out.angular.z   
        self.publishers_cmd.publish(msg=self.output)
        self.publishers_status.publish(msg=ControlSystemStatus(
            depth=float(self.thrusterboardInfo.depth),
            imu_data=Vector3(x=float(roll), y=float(pitch), z=float(yaw)),
            in_progress=self.stopTimer is not None
        ))
        # self.get_logger().info(f"output: {self.output}")
        info = f"""
        Locked motion: {self.stopTimer is not None}
        PID:
            pitch angular PID output: {self.pitch_pid.setpoint} -> {self.output.angular.y:.2f}
            
            yaw angular PID output: {self.yaw_pid.setpoint} -> {self.output.angular.z:.2f} 
            setpoint {self.setpoint} -> error {self.yaw_error_calculation():.2f}
            mag setpoint: {self.mag_setpoint}
            acc setpoint: {self.acc_setpoint}
            
            roll angular PID output: {self.roll_pid.setpoint} -> {self.output.angular.x:.2f}
            depth linear PID output: {self.depth_pid.setpoint} -> {self.output.linear.z:.2f}
        IMU:
            roll : {roll:.2f}
            pitch: {pitch:.2f}
            yaw  : {yaw:.2f}
            heading: {self.heading} std : {self.heading_std:.2f}
        Depth: {self.thrusterboardInfo.depth:.2f}
        """
        self.get_logger().info(info)

    def compass_enable_callback(self, msg : Bool) -> None:
        self.compass_enable = msg.data
        if msg.data:
            self.setpoint = self.mag_setpoint
        else:
            self.setpoint = self.acc_setpoint

    def magnetic_callback(self, msg: Vector3) -> None:
        """Magnetic callback function to process the magnetic data.
        
        Args:
            msg (Vector3): Magnetic data
        """
        # facing_north_x = 1240
        # facing_north_y = 410
        # # facing_soutch_x = 710
        # # facing_soutch_y = 365
        # # facing_east_x = 880
        # # facing_east_y = 720
        # # facing_west_x = 930
        # # facing_west_y = -24
        # heading = np.arctan2(msg.y - facing_north_y, msg.x - facing_north_x)
        # self.heading = (heading + 2 * np.pi) % (2 * np.pi)  # Normalize heading to range [0, 2π]
        # self.heading_log.append(self.heading)
        
        # # limit the heading log to 100
        # if len(self.heading_log) > 100:
        #     # remove the first element
        #     self.heading_log.pop(0)
    
        # # if the heading is stable, reset the acc_setpoint
        # self.heading_std = np.std(self.heading_log)
        # # if len(self.heading_log) == 100 and np.std(self.heading_log) < 0.01:
        # #     self.set_acc_setpoint_callback(Bool(data=True))
        # #     self.set_setpoint_callback(Bool(data=True))
            
        
        
        # self.get_logger().warning(f'Heading: {heading}')

    def magnetic_pose_2d_callback(self, msg: Pose2D) -> None:
        """Magnetic pose 2D callback function to process the magnetic pose 2D data.
        
        Args:
            msg (Vector3): Magnetic pose 2D data
        """
        heading = msg.theta
        self.heading = (heading + 2 * np.pi) % (2 * np.pi)  # Normalize heading to range [0, 2π]
        # pass

    def vision_too_close_enable_callback(self, msg: Bool) -> None:
        """Vision too close enable callback function to enable the too close feature.
        
        Args:
            msg (Bool): Boolean to enable the too close feature
        """
        self.too_close_enable = msg.data
        self.get_logger().info(f'Too close enable: {self.too_close_enable}')

    def vision_callback(self, msg: VisionSystem) -> None:
        """Vision callback function to process the vision data.
        
        Args:
            msg (VisionSystem): Vision data
        """
        self.vision_data = msg

    def set_current_yaw_callback(self, msg: Bool) -> None:
        """Set current yaw as target when message is True. All setpoint will be reset.
        
        Args:
            msg (Bool): Boolean to trigger setting current yaw as target
        """
        if msg.data:
            self.set_acc_setpoint_callback(Bool(data=True))
            self.set_mag_setpoint_callback(Bool(data=True))
            self.set_setpoint_callback(Bool(data=True))
            self.yaw_pid.reset()
            # self.get_logger().info(f'Set current yaw {self.current_yaw} as target')

    def set_mag_setpoint_callback(self, msg : Bool) -> None:
        if msg.data:
            self.mag_setpoint = np.rad2deg(self.heading)

    def set_acc_setpoint_callback(self, msg : Bool) -> None:
        if msg.data:
            self.acc_setpoint = np.rad2deg(self.heading_acc)

    def set_setpoint_callback(self, msg : Bool) -> None:
        if msg.data:
            if self.compass_enable:
                self.setpoint = self.mag_setpoint
            else:
                self.setpoint = self.acc_setpoint

    def set_current_depth_callback(self, msg: Bool) -> None:
        """Set current yaw as target when message is True.
        
        Args:
            msg (Bool): Boolean to trigger setting current yaw as target
        """
        if msg.data:
            self.depth_pid.setpoint = self.thrusterboardInfo.depth
            self.depth_pid.reset()
            # self.get_logger().info(f'Set current depth {self.thrusterboardInfo.depth} as target')

    def pid_depth_callback(self, msg: Float64MultiArray) -> None:
        """PID depth callback function to set the PID parameters.
        
        Args:
            msg (Float64MultiArray): PID parameters
        """
        self.depth_pid.Kp = msg.data[0]
        self.depth_pid.Ki = msg.data[1]
        self.depth_pid.Kd = msg.data[2]
        self.setpoint_depth_callback(Float64(data=msg.data[3]))
        self.get_logger().debug(message='Depth PID: {}'.format(msg.data))

    def setpoint_depth_callback(self, msg: Float64) -> None:
        """Setpoint depth callback function to set the setpoint depth.
        
        Args:
            msg (Float64): Setpoint depth
        """
        self.depth_pid.setpoint = msg.data
        self.get_logger().debug(message='Setpoint depth: {}'.format(msg.data))
        

    def pid_pitch_callback(self, msg: Float64MultiArray) -> None:
        """PID pitch callback function to set the PID parameters.
        
        Args:
            msg (Float64MultiArray): PID parameters
        """
        self.pitch_pid.Kp = msg.data[0]
        self.pitch_pid.Ki = msg.data[1]
        self.pitch_pid.Kd = msg.data[2]
        self.pitch_pid.setpoint = msg.data[3]
        self.get_logger().debug(message='Pitch PID: {}'.format(msg.data))

    def pid_yaw_callback(self, msg: Float64MultiArray) -> None:
        """PID yaw callback function to set the PID parameters.
        
        Args:
            msg (Float64MultiArray): PID parameters
        """
        self.yaw_pid.Kp = msg.data[0]
        self.yaw_pid.Ki = msg.data[1]
        self.yaw_pid.Kd = msg.data[2]
        self.yaw_pid.setpoint = msg.data[3]
        self.get_logger().debug(message='Yaw PID: {}'.format(msg.data))

    def setpoint_yaw_callback(self, msg: Float64):
        self.setpoint = (self.setpoint + msg.data + 180) % 360 - 180

    def pid_roll_callback(self, msg: Float64MultiArray) -> None:
        """PID roll callback function to set the PID parameters.
        
        Args:
            msg (Float64MultiArray): PID parameters
        """
        self.roll_pid.Kp = msg.data[0]
        self.roll_pid.Ki = msg.data[1]
        self.roll_pid.Kd = msg.data[2]
        self.roll_pid.setpoint = msg.data[3]
        self.get_logger().debug(message='Roll PID: {}'.format(msg.data))

    def pid_toggle_callback(self, msg: Bool) -> None:
        """PID toggle callback function to toggle the PID system.
        
        Args:
            msg (Bool): Toggle message
        """
        self.get_logger().debug(message='PID toggle: {}'.format(msg.data))
        if msg.data:
            self.pitch_pid.set_auto_mode(enabled=True, last_output=0)
            self.yaw_pid.set_auto_mode(enabled=True, last_output=0)
            self.roll_pid.set_auto_mode(enabled=True, last_output=0)
            self.depth_pid.set_auto_mode(enabled=True, last_output=0)
        else:
            self.pitch_pid.set_auto_mode(enabled=False, last_output=0)
            self.yaw_pid.set_auto_mode(enabled=False, last_output=0)
            self.roll_pid.set_auto_mode(enabled=False, last_output=0)
            self.depth_pid.set_auto_mode(enabled=False, last_output=0)
            self.output = Twist()

    def thruster_status_callback(self, msg: ThrusterBoardStatus) -> None:
        """Thruster status callback function to process the thruster status.
        """
        if self.thrusterboardInfo is None:
            self.thrusterboardInfo = ThrusterBoardInfo()
        self.thrusterboardInfo.update(msg)

    def imu_acc_callback(self, msg: Imu) -> None:
        """IMU acceleration callback function to process the IMU acceleration data.
        
        Args:
            msg (Imu): IMU acceleration data
        """
        if time() - self.imu_update_time > 0.1:
            self.imu_update_time = time()
        
    
    def imu_callback(self, msg: Vector3) -> None:
        """IMU callback function to process the IMU data.
        
        Args:
            msg (Imu): IMU data
        """
        x = msg.x
        y = msg.y
        self.heading_acc = msg.z
        if not self.compass_enable:
            z = self.heading_acc
        else:
            z = self.heading
        
        # z = self.kalman_filter(z, self.heading)
        roll = (x) * 180 / np.pi
        # if roll < 0:
        #     roll = 180 + (180 + roll)
        pitch = (y * 180) / np.pi
        
        yaw = (z * 180) / np.pi
        # if yaw > 180:
        #     yaw = -180 + (yaw - 180)

        if self.roll_pitch_yaw is None:
            self.roll_pitch_yaw = Vector3(x=roll, y=pitch, z=yaw)
        self.roll_pitch_yaw_log.append(Vector3(x=roll, y=pitch, z=yaw))

        if len(self.roll_pitch_yaw_log) > 5:
            avg_roll = np.median([rpy.x for rpy in self.roll_pitch_yaw_log[-10:]])
            avg_pitch = np.median([rpy.y for rpy in self.roll_pitch_yaw_log[-10:]])
            avg_yaw = np.median([rpy.z for rpy in self.roll_pitch_yaw_log[-10:]])
            self.roll_pitch_yaw.x = round(avg_roll, 1)
            self.roll_pitch_yaw.y = round(avg_pitch, 1)
            self.roll_pitch_yaw.z = round(avg_yaw, 1)
            self.roll_pitch_yaw_log = []
        # self.roll_pitch_yaw_log.append(Vector3(x=roll, y=pitch, z=yaw))
        # if len(self.roll_pitch_yaw_log) > 100:
        #     self.roll_pitch_yaw = Vector3(
        #         x=np.mean([i.x for i in self.roll_pitch_yaw_log]),
        #         y=np.mean([i.y for i in self.roll_pitch_yaw_log]),
        #         z=np.mean([i.z for i in self.roll_pitch_yaw_log])
        #     )
        #     self.roll_pitch_yaw_log = []
        

    def cmd_listener_callback(self, msg : Twist) -> None:
        # print the twist message
        if self.stopTimer is None:
            # self.get_logger().debug(f'Received command: {msg.linear.x}, {msg.linear.y}, {msg.linear.z}, {msg.angular.x}, {msg.angular.y}, {msg.angular.z}')
            self.user_input = msg
            # self.stopTimer = time()
            if msg.angular.z != 0:
                # self.yaw_pid.setpoint = None
                self.setpoint = None
            if msg.linear.z != 0:
                self.depth_pid.setpoint = None
        else:
            self.get_logger().info(f"Still in motion, wait for {self.stepTime - (time() - self.stopTimer):0.2f} seconds")

    def yaw_error_calculation(self) -> float:
        if self.setpoint is None:
            return 0
        return (self.setpoint + 180 - self.roll_pitch_yaw.z) % 360 - 180
        


def main(args=None):
    rclpy.init(args=args)
    pid_system_node = pid_system()
    rclpy.spin(pid_system_node)
    pid_system_node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()