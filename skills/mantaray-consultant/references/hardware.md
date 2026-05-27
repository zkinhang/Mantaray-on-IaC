# Hardware Reference

Documentation of the physical hardware integration and mapping within the Kubernetes cluster.

## Node Mapping
The cluster uses `nodeSelector` to ensure pods run on the correct hardware.

| Node Name | Label (`ros2-hardware`) | Primary Role | Key Hardware |
|-----------|-------------------------|--------------|--------------|
| `mantaray`| `land-pc`               | Surface      | Joystick (USB), WebUI Server |
| `rov-cam` | `rov-main`              | Control      | Camera (USB), Thruster Board (Serial), IMU |
| `rov`     | `rov-camera`            | Associate    | Camera (USB), ESP32 (Micro-ROS)|

## Device Volumes
Host devices are mapped into containers via the `manta-ray-deployment.yaml.j2` template, defined by variables in `ansible/vars/hardware-paths.yaml`.

### Hardware Mappings (`ansible/vars/hardware-paths.yaml`):
- **Video Devices**: `path_a_camera` and `path_b_camera` (typically `/dev/video1`) map webcams for streaming and vision processing.
- **USB & Serial Devices**: `path_imu` (`/dev/imu`) for the IMU sensor and `path_microros_serial` (`/dev/ttyUSB0`) for Micro-ROS communication.

## Configuration (ConfigMaps)
Hardware-specific parameters are stored in `ansible/config/robot_params.json` and injected via the `robot-params` ConfigMap.