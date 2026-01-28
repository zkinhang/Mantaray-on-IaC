---
name: mantaray-consultant
description: Technical consultant for the Mantaray-on-IaC ROV project. Provides guidance on ROS2 architecture, K3s infrastructure, Ansible deployment, and hardware integration.
---

# Mantaray Consultant

This skill provides expert guidance for the Mantaray-on-IaC project, covering infrastructure, software architecture, and deployment workflows.

## Core Architecture

### 1. Infrastructure Layer (The Foundation)
- **Technology**: K3s (Lightweight Kubernetes) cluster managed via Ansible.
- **Environment**: Distributed ROS2 Jazzy.
- **Nodes**:
  - `land-pc` (mantaray.local): Surface control, joystick input, UI.
  - `rov-main` (rov-cam.local): Main ROV control, PID, sensors.
  - `rov-camera` (rov.local): Streaming, Micro-ROS hardware interface.
- **Registries**: Local Docker registry at `mantaray.local:5000` for air-gapped deployment.

### 2. Orchestration Layer (The Brain)
- **Management**: Pods are scheduled via K3s deployments with `nodeSelector` targeting physical hardware.
- **Workflow**: `ansible/playbook-app.yaml` manages rolling updates and configuration injection.

### 3. Application Layer (The ROS2 Nervous System)
The application is modularized within `src/`:
- **Core ROS2 (`src/ros2/`)**:
  - `control_system_pkg`: PID and stabilization logic.
  - `controller_pkg`: Human-machine interface/joystick handling.
  - `thrusterboard_pkg`: Direct communication with motor drivers.
  - `fdilink_ahrs_ROS2`: AHRS/IMU sensor integration.
  - `ui_pkg`: The ROV dashboard/HUD.
  - `custom_interfaces`: Domain-specific ROS2 msg/srv definitions.
- **Hardware Interface (`src/microRos/`)**: Bridge for low-level controllers (ESP32/Teensy).
- **Streaming (`src/http_streamer/`)**: High-performance video streaming node.
- **Launch System (`src/launch_file/`)**: Orchestrates node interaction.

## Repository Layout

To maintain meticulous order, the project is structured as follows:

- **`ansible/`**: The orchestration core. Contains playbooks for infrastructure (`playbook-infra-airgap.yaml`), network switching, and application deployment.
- **`src/`**: The source code repository for ROS2 packages (`ros2/`), hardware bridges (`microRos/`), and specialized streaming nodes.
- **`docker/`**: Containerization logic. Defines the runtime environment for the ROV software.
- **`skills/`**: The "Command Post". Contains technical guidance (SKILL.md) and utility scripts for diagnostics and parameter management.
- **`k3s-setup/`**: Low-level scripts for bootstrapping the Kubernetes cluster in air-gapped environments.
- **Root Scripts**: Contains top-level automation scripts for building images (`buildimage.sh`), pushing to local registries (`local_registry_push.sh`), and fixing permissions (`kube_permission.sh`).

## Key Workflows

### Infrastructure Setup & Maintenance
- **Initial Setup (Full Reinstall)**: Run `ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml`. Avoid running this unless a total cluster reset is required.
- **Fix IP/Network Changes (Preferred)**: Run `ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml`. This fixes IP mismatches and interface changes (e.g., Wi-Fi to Ethernet) or any malfunctioning after a period of time, without reinstalling the cluster.
- **Post-Setup Permission Fix**: **Critical**: Always run `bash kube_permission.sh` after cluster changes to fix local `kubectl` access.

### Application Deployment
- **Build**: `./copy_to_local_registry.sh`.
- **Deploy/Update Config**: `ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml`. Use this after editing `robot_params.json`; it automatically restarts relevant control nodes.
- **Full Application Restart**: Add `-e "force_restart=true"` to the deploy command to force a rolling update of all pods (use for code changes or verifying a fresh state).

### Configuration
- `ansible/config/robot_params.json`: Centralized PID gains, port assignments, and sensor offsets.
- `ansible/vars/hardware-paths.yaml`: Maps peripheral devices to container volumes.

## Debugging and Maintenance
- **Cluster Diagnostics**: See [references/troubleshooting.md](references/troubleshooting.md).
- **Hardware Integration**: See [references/hardware.md](references/hardware.md).
- **ROS2 Packages**: See [references/ros2-packages.md](references/ros2-packages.md).

### Useful Scripts
- `scripts/debug_info.sh`: Quick overview of cluster health and pod status.
- `scripts/get_params.sh`: Fetches current ConfigMap values for `robot_params`.

## Best Practices
- **Network Interfaces**: Use `playbook-network-switch.yaml` when migrating between Wi-Fi and Ethernet.
- **Node Specificity**: Always use `nodeSelector` in manifests to ensure containers land on the correct physical hardware.
