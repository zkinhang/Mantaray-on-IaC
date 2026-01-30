# ROS2 Package Directory

Overview of the custom and integrated ROS2 packages in the `src/` directory.

## Core Control & Logic

### `control_system_pkg`
- **Role**: ROV stabilization and navigation.
- **Functions**: Implements PID controllers for Pitch, Roll, Yaw, and Depth.
- **Topics**: Subscribes to IMU data/barometer, publishes to `/pid/cmd_vel`.

### `controller_pkg`
- **Role**: Teleoperation interface.
- **Functions**: Reads Xbox controller inputs using Pygame and translates them into motion commands.
- **Topics**: Publishes to `/controller/console`.

### `receiver_pkg`
- **Role**: Command decomposition.
- **Functions**: Translates high-level mission commands into specific hardware actions (e.g., `gripper_decomposer.py` for robotic arm control).
- **Topics**: Bridges high-level console commands to low-level hardware interfaces.

## Hardware Drivers & Communication

### `thrusterboard_pkg`
- **Role**: Hardware abstraction for thrusters.
- **Functions**: Translates `/pid/cmd_vel` into serial commands for the ESCs (Electronic Speed Controllers).
- **Interfaces**: Serial/UART.

### `fdilink_ahrs_ROS2`
- **Role**: IMU Driver.
- **Functions**: Interface for FM-Link/FDILink AHRS (Attitude and Heading Reference System) sensors.
- **Outputs**: Standard `sensor_msgs/Imu` data.

### `serial_ros2`
- **Role**: Serial communication backbone.
- **Functions**: A C++ library providing a standardized interface for RS-232 and TTL serial communication.

### `http_streamer`
- **Role**: Low-latency video streaming.
- **Formats**: MJPEG.
- **Protocols**: HTTP.

## Interface & Infrastructure

### `custom_interfaces`
- **Role**: Project-specific data definitions.
- **Contents**: Custom IDL `.msg` files for ROV telemetry, power status, and automation states.

### `debug_pkg`
- **Role**: Diagnostic tools.
- **Functions**: Contains test scripts for validating Micro-ROS connectivity (`microros_test.py`) and serial health (`serial_test.py`).

### `foxglove_bridge`
- **Role**: Advanced visualization.
- **Usage**: Modern alternative to RViz, allowing Foxglove Studio to connect via WebSockets for real-time monitoring and charting.

### `rosbridge_suite`
- **Role**: Web connectivity.
- **Usage**: Provides a JSON-based API for the React-based Web UI to interact with the ROS 2 graph.
