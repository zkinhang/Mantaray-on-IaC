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
  - `thrusterboard_pkg`: Direct communication with thrusters.
  - `fdilink_ahrs_ROS2`: AHRS/IMU sensor integration.
  - `receiver_pkg`: Translates high-level commands from controller to digital signals to be written to hardware (e.g. grippers).
  - `custom_interfaces`: Domain-specific ROS2 msg/srv definitions.
  - `pid_system`: Advanced stabilization logic (recently updated with enhanced gains and derivative filtering).
- **WebUI Control Interface (`src/webUI/`)**: Offline-first control panel. Uses local fonts, Tailwind CSS, and roslib to operate in air-gapped or restricted network environments.
- **Hardware Interface (`src/microRos/`)**: Bridge for low-level controllers (ESP32/Teensy).
- **Streaming (`src/http_streamer/`, `src/webrtc_streamer/`)**: High-performance video streaming nodes. Transitioning from MJPEG over HTTP to WebRTC for lower latency and bandwidth efficiency.
- **Launch System (`src/launch_file/`)**: Orchestrates node interaction.

## Repository Layout

To maintain meticulous order, the project is structured as follows:

```text
.
├── ansible/          # Infrastructure orchestration (Playbooks & K8s manifests)
├── docker/           # Containerization logic and runtime environments
├── k3s-setup/        # Air-gapped Kubernetes cluster bootstrapping scripts
├── skills/           # Technical guidance and utility diagnostic scripts
├── src/              # Multi-language source code (e.g. ROS 2, Micro-ROS, C++, etc)
└── *.sh              # Root-level automation for building and deployment
```

- **Root Scripts**: Contains top-level automation scripts for building images and pushing to local registries (`build_and_copy_to_local_registry.sh`), and fixing permissions (`kube_permission.sh`).

## Knowledge & Documentation
- **Knowledge Hub**: Managed via `skills/notion-hub-sync/`. 
- **Sync Protocol**:
  - `manta_hub_sync.py`: Downloads published documents from Notion to `/home/EEC/clawd/docs/notion_sync/published/`.
  - `manta_hub_upload.py`: Uploads pending documents from `/home/EEC/clawd/docs/notion_sync/pending/` to Notion.
- **Naming Convention**: Follows the `PREFIX_topic_REF_Name.md` format for truth resolution.

## Key Workflows

### Infrastructure Setup & Maintenance
- **Initial Setup (Full Reinstall)**: Run `ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml`. Avoid running this unless a total cluster reset is required.
- **Fix IP/Network Changes (Preferred)**: Make sure the network config in `ansible/inventory_infra.ini` is up-to-date, and run `ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml`. This fixes IP mismatches and interface changes (e.g., Wi-Fi to Ethernet) or any malfunctioning after a period of time, without reinstalling the cluster.
- **Post-Setup Permission Fix**: **Critical**: Always run `bash kube_permission.sh` after cluster changes to fix local `kubectl` access.
- **Dashboard Access**: After infrastructure changes, run `ansible-playbook -i  ansible/playbook-dashboard-setup.yaml` to re-expose the UI and generate a refreshed admin token for access.

### Application Deployment
- **Build**: `./build_and_copy_to_local_registry.sh`.
- **Deploy/Update Config**: `ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml`. Use this after editing `robot_params.json`; it automatically restarts relevant control nodes.
- **Full Application Restart**: Add `-e "force_restart=true"` to the deploy command to force a rolling update of all pods following  (use for code changes or verifying a fresh state)`ansible/vars/deployment-vars.yaml`.

### Configuration
- `ansible/config/robot_params.json`: Centralized PID gains, port assignments, and sensor offsets.
- `ansible/vars/deployment-vars.yaml`: Manages container images and lists all active Kubernetes deployments for the application.
- `ansible/vars/hardware-paths.yaml`: Maps physical peripheral devices (cameras, IMUs, serial ports) to container volumes.
- `ansible/vars/infra-vars.yaml`: Defines cluster-wide settings, including installation paths, local registry ports, node labels, and physical network interface names.

## Debugging and Maintenance
- **Cluster Diagnostics**: See [references/troubleshooting.md](references/troubleshooting.md).
- **Network Recovery**: If internet access is lost after switching between eth and wlan, restart the system service: `sudo systemctl restart NetworkManager`.
- **Hardware Integration**: See [references/hardware.md](references/hardware.md).
- **ROS2 Packages**: See [references/ros2-packages.md](references/ros2-packages.md).

### Useful Scripts
- `scripts/debug_info.sh`: Quick overview of cluster health and pod status.
- `scripts/get_params.sh`: Fetches current ConfigMap values for `robot_params`.

## Best Practices
- **Network Interfaces**: Use `playbook-network-switch.yaml` when migrating between Wi-Fi and Ethernet.
- **Node Specificity**: Always use `nodeSelector` in manifests to ensure containers land on the correct physical hardware.

## Consultant Protocol (Role Definition)
As a Mantaray Consultant, your role is to provide elite technical guidance while preserving the integrity of the core system.

### 1. The "Read-Only" Mandate
- **Analyze & Advise**: Your primary function is code analysis and strategic advice. 
- **Hands-Off Core**: Do not modify files in the repository root, `src/`, `ansible/`, or `docker/` directories. All proposed changes must be presented as a "Change List" for human review or execution.
- **Skill Maintenance**: Edits are only permitted within the `skills/` directory for documentation and tool refinement.

### 2. Analysis Methodology
- **Meticulous Investigation**: Use `serena` for deep code introspection. 
- **Contextual Alignment**: Always cross-reference code logic with the Notion Knowledge Hub to ensure consistency with SOPs and project history.

### 3. Reporting & Continuity
- **Diagnostic Reports**: When issues are found, generate clear, actionable reports.
- **Knowledge Capture**: Ensure all insights are synchronized to the Knowledge Hub using the sync tools.
