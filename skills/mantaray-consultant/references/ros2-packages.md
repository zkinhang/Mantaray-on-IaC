# ROS2 Package Directory

Overview of the custom ROS2 packages in the `src/` directory.

## Core Packages

### `thrusterboard_pkg`
- **Role**: Hardware abstraction for thrusters.
- **Functions**: Translates `/pid/cmd_vel` into serial commands for the ESCs.
- **Interfaces**: Serial/UART.

### `http_streamer`
- **Role**: Low-latency video streaming.
- **Formats**: MJPEG.
- **Protocols**: HTTP.

## Interface & Utility

### `custom_interfaces`
- **Role**: Custom IDL (Interface Definition Language) files.
- **Contents**: Custom messages for ROV state and command packets.

### `receiver_pkg`
- **Role**: Input processing.
- **Functions**: Decodes joystick inputs from the `land-pc` into ROS2 messages.

## Infrastructure Integration

### `foxglove_bridge`
- **Role**: Connectivity for industrial visualization.
- **Usage**: Allows Foxglove Studio to connect via WebSocket.

### `rosbridge_suite`
- **Role**: JSON-based bridge for the Web UI.
- **Usage**: Used by the React frontend in `src/webUI/`.
