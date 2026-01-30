# Hardware Reference

Documentation of the physical hardware integration and mapping within the Kubernetes cluster.

## Node Mapping
The cluster uses `nodeSelector` to ensure pods run on the correct hardware.

| Node Name | Label (`ros2-hardware`) | Primary Role | Key Hardware |
|-----------|-------------------------|--------------|--------------|
| `mantaray`| `land-pc`               | Surface      | Joystick (USB), WebUI Server |
| `rov-cam` | `rov-main`              | Control      | Thruster Board (Serial), IMU |
| `rov`     | `rov-camera`            | Associate    | Cameras (USB), ESP32 (Micro-ROS)|

## Device Volumes
Host devices are mapped into containers via the `manta-ray-deployment.yaml.j2` template, influenced by variables in `ansible/vars/hardware-paths.yaml`.

### Typical Mappings:
- **Video Devices**: `/dev/video0`, `/dev/video1` -> For streaming and vision processing.
- **Serial Devices**: `/dev/ttyUSB0`, `/dev/ttyACM0` -> For thruster communication and IMU data.

## Configuration (ConfigMaps)
Hardware-specific parameters are stored in `ansible/config/robot_params.json` and injected via the `robot-params` ConfigMap.