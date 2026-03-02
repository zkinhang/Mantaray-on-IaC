from launch import LaunchDescription
from launch_ros.actions import Node
import os
from pathlib import Path
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (DeclareLaunchArgument, GroupAction,
                            IncludeLaunchDescription, SetEnvironmentVariable)
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
from launch.substitutions import LaunchConfiguration
# bringup_dir = get_package_share_directory('fdilink_ahrs')
# launch_dir = os.path.join(bringup_dir, 'launch')
# imu_tf = IncludeLaunchDescription(
#         PythonLaunchDescriptionSource(os.path.join(launch_dir, 'imu_tf.launch.py')),
# )
def generate_launch_description():
    params_file_arg = DeclareLaunchArgument(
            'params_file',
            default_value='',
            description='Path to the ROS 2 parameters file to load.'
        )
    params_file = LaunchConfiguration('params_file')
    ahrs_driver=Node(
        package="fdilink_ahrs",
        executable="ahrs_driver_node",
        parameters=[params_file],
        output="screen"
    )
    thruster= Node(
        package='thrusterboard_pkg',
        executable='thrusterboard_node',
        # Name must match the key in the params file
        name='thrusterboard_rosserial',
        # Pass the same params_file to this node
        parameters=[params_file]
    )
    launch_description =LaunchDescription()
    launch_description.add_action(params_file_arg)
    launch_description.add_action(ahrs_driver)
    launch_description.add_action(thruster)
#    launch_description.add_action(imu_tf)
    return launch_description