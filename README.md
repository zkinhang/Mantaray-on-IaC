# APP documentations

[Project Documentation](https://mellow-cap-3e1.notion.site/ebd/28700ae3fb2281b3afd4f744baa0d396?v=28700ae3fb2281af9793000cdafe78d9)

---

# Ansible Playbook Manual

## Quick Command Reference
(you may add `uv run` before it)
```bash
# Full installation
ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
bash kube_permission.sh
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
bash display_init.sh

# Network switch
ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
bash kube_permission.sh
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml

# Apply changes from robot_params.json
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml

# Deploy all apps
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"

# Dashboard only
ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml

# Verify cluster
kubectl get nodes
kubectl get pods
```

---

## Playbook Overview

| Playbook | Purpose |
|----------|---------|
| `playbook-infra-airgap.yaml` | Full cluster installation (air-gapped) |
| `playbook-network-switch.yaml` | Reconfigure cluster networking |
| `playbook-app.yaml` | Deploy applications and apply config changes |
| `playbook-dashboard-setup.yaml` | Deploy Kubernetes dashboard |

---

## 1. Infrastructure Playbook: `playbook-infra-airgap.yaml`

**What it does:** Provisions the entire K3s cluster from scratch in an air-gapped environment. Installs K3s server and agents, configures container runtimes, sets up the local Docker registry, and applies node labels.

**When to run it:**
- Initial cluster setup
- Adding new nodes to the cluster
- Replacing failed hardware
- Full cluster reinstallation

### Variables

Configure in `ansible/inventory_infra.ini`:

| Variable | Description |
|----------|-------------|
| `force_k3s_reinstall` | Set to `true` to force complete reinstallation |
| `ansible_k3s_server_ip` | IP address for the K3s server node |
| `ansible_k3s_agent_ip` | IP address for agent nodes |

### How to Run

```bash
ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
```

### Post-Installation: Fix Kubernetes Permissions

After running this playbook, you **must** fix kubectl permissions:

```bash
bash kube_permission.sh
```

---

## 2. Network Switch Playbook: `playbook-network-switch.yaml`

**What it does:** Reconfigures the cluster when network interfaces or IP addresses change. Updates node-ip settings, flannel interface bindings, and ensures all nodes can communicate on the new network.

**When to run it:**
- Changing the network interface (e.g., `eth0` → `wlan0`)
- Changing node IP addresses
- Switching between networks

### Variables

Update in `ansible/inventory_infra.ini`:

| Variable | Description |
|----------|-------------|
| `ansible_k3s_server_ip` | New IP address for the K3s server |
| `ansible_k3s_agent_ip` | New IP addresses for agent nodes |
| `ansible_default_ipv4.interface` | Network interface to use |

### How to Run

```bash
ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
```

### Post-Network Switch: Fix Kubernetes Permissions

After running this playbook, you **must** fix kubectl permissions:

```bash
bash kube_permission.sh
```

---

## 3. Application Playbook: `playbook-app.yaml`

**What it does:** Deploys and manages applications on the cluster. Applies Kubernetes manifests, updates ConfigMaps from `robot_params.json`, and performs rolling updates when configurations change.

**When to run it:**
- Deploying new application versions
- Updating robot parameters in `config/robot_params.json`
- Forcing a full application restart

### How to Run

**Deploy or update applications:**
```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
```

**Force restart all applications:**
```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

---

## 4. Dashboard Playbook: `playbook-dashboard-setup.yaml`

**What it does:** Installs the Kubernetes Dashboard, creates an admin user with a permanent token, and exposes the dashboard on the local network.

**When to run it:**
- After initial cluster setup
- After network reconfiguration
- After cluster reinstallation

### How to Run

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
```

The playbook will output:
- Dashboard URL
- Path to the admin token file (`dashboard-admin-token.txt`)

---

## Typical Testing Workflow

### Full Installation Test

1. **Configure variables** in `ansible/inventory_infra.ini`:
   - Set `force_k3s_reinstall=true`
   - Set correct IP addresses and interfaces

2. **Run infrastructure playbook:**
   ```bash
   ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
   ```

3. **Fix kubectl permissions:**
   ```bash
   bash kube_permission.sh
   ```

4. **Deploy applications:**
   ```bash
   ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
   ```

5. **Setup dashboard:**
   ```bash
   ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
   ```

6. **Verify cluster:**
   ```bash
   kubectl get nodes
   kubectl get pods -A
   ```

### Network Switch Test

1. **Edit network settings** in `ansible/inventory_infra.ini`:
   - Update IP addresses
   - Update network interface names

2. **Run network switch playbook:**
   ```bash
   ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
   ```

3. **Fix kubectl permissions:**
   ```bash
   bash kube_permission.sh
   ```

4. **Redeploy applications:**
   ```bash
   ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
   ```

5. **Redeploy dashboard:**
   ```bash
   ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
   ```

---

## Important Notes

### Kubernetes Permission Issue

Currently, kubectl permissions are not automatically configured. **You must run the following after any cluster configuration:**

```bash
bash kube_permission.sh
```

This script copies the kubeconfig and sets correct ownership:
```bash
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER":"$USER" ~/.kube/config
```

---

## TODO

- [ ] Fix automatic Kubernetes permission configuration
- [ ] CI/CD pipeline for uploading images to local registry
- [x] Control panel UI (see [Mantaray Control Interface](#mantaray-control-interface-web-ui))

---

# Mantaray Control Interface (Web UI)

The `src/webUI/mantaray-control-interface` directory contains a browser-based control interface for the Mantaray ROV, developed by Louis ([@Louis1125](https://github.com/Louis1125)).

## Features

| Module | Description |
|--------|-------------|
| **Primary Dashboard** | Real-time dual-camera video feeds (ROV + ROV-CAM), terminal logs, and flight controls |
| **Movement Control** | Directional movement (forward/backward/left/right/up/down) with configurable speed and duration via ROS 2 `/cmd_vel` topic |
| **PID Toggle** | Enable/disable the PID controller via the `/pid/toggle` ROS 2 topic |
| **Advanced Telemetry** | Sensor diagnostics and environment monitoring |
| **System Configuration** | ROS bridge host configuration (persisted in `localStorage`) |

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 6** (build tooling)
- **Tailwind CSS 4** (styling)
- **roslib.js** (ROS 2 WebSocket bridge, loaded via CDN)
- **lucide-react** (icons)

## Prerequisites

- **Node.js ≥ 18** and **npm**
- A running **ROS 2** environment with [`rosbridge_server`](https://github.com/RobotWebTools/rosbridge_suite) on port `9090`
- Camera streams accessible at the configured URLs (default: `http://rov:30001/stream` and `http://rov-cam:30002/stream`)

## Running in Development

```bash
cd src/webUI/mantaray-control-interface
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Building for Production

```bash
cd src/webUI/mantaray-control-interface
npm install
npm run build
# Output is in dist/
npm run preview   # preview the production build locally
```

## Configuration

The ROS bridge host can be set from the **System Configuration** page inside the UI. It defaults to `localhost` (or the current hostname if the page is served from the robot). The setting is persisted in the browser's `localStorage` under the key `ros_target_host`.

Camera stream URLs can be edited live from the Dashboard page – each stream panel has an inline URL editor.

## Prototype HTML

A standalone, dependency-free prototype is available at `src/webUI/prototype.html`. Open it directly in a browser (no build step needed) for a lightweight fallback controller.

## Directory Structure

```
src/webUI/
├── prototype.html                  # Standalone single-file controller (no build required)
└── mantaray-control-interface/     # Full React/TypeScript application
    ├── components/                 # Reusable UI components
    │   ├── ControlPanel.tsx        # Mission control sidebar (PID + movement)
    │   ├── CountdownTimer.tsx      # Movement duration countdown
    │   ├── Header.tsx              # Top navigation bar
    │   ├── Layout.tsx              # Page layout wrapper
    │   ├── MovementControl.tsx     # Directional movement buttons
    │   ├── Navigation.tsx          # Side navigation
    │   ├── StreamView.tsx          # Camera stream panel
    │   └── TerminalLogs.tsx        # ROS event/log output
    ├── context/
    │   └── RosContext.tsx          # Global ROS connection state
    ├── hooks/
    │   └── useStreams.ts           # Camera stream URL management
    ├── pages/
    │   ├── DashboardPage.tsx       # Main operational dashboard
    │   ├── LandingPage.tsx         # Module selection landing page
    │   ├── SettingsPage.tsx        # Connection & hardware settings
    │   └── TelemetryPage.tsx       # Sensor telemetry view
    ├── services/
    │   └── rosService.ts           # ROS 2 bridge service (topics, connection)
    ├── App.tsx                     # Root application component
    ├── index.html                  # HTML entry point
    ├── index.tsx                   # React entry point
    ├── types.ts                    # Shared TypeScript types
    ├── vite.config.ts              # Vite configuration
    └── package.json                # Dependencies and scripts
```
