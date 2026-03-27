# APP documentations

[Project Documentation](https://mellow-cap-3e1.notion.site/ebd/28700ae3fb2281b3afd4f744baa0d396?v=28700ae3fb2281af9793000cdafe78d9)

---

# Ansible Playbook Manual

## Quick Command Reference
```bash
# Full installation
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml # Error is expected in this step due to kubeconfig permissions
bash kube_permission.sh
ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml

# Network switch
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
bash kube_permission.sh
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml

# Apply changes from robot_params.json
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml

# Deploy all apps
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"

# Dashboard only
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml

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
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
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
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
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
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
```

**Force restart all applications:**
```bash
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
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
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
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
   uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
   ```

3. **Fix kubectl permissions:**
   ```bash
   bash kube_permission.sh
   ```

4. **Deploy applications:**
   ```bash
   uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
   ```

5. **Setup dashboard:**
   ```bash
   uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
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
   uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
   ```

3. **Fix kubectl permissions:**
   ```bash
   bash kube_permission.sh
   ```

4. **Redeploy applications:**
   ```bash
   uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
   ```

5. **Redeploy dashboard:**
   ```bash
   uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
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
### Lost internet access after changing between eth and wlan

Restart the system service by:

```bash
sudo systemctl restart NetworkManager
```
---

## TODO

- [ ] Fix automatic Kubernetes permission configuration
- [ ] CI/CD pipeline for uploading images to local registry
- [ ] Integrate webRTC to cluster
- [ ] Integrate webUI to cluster
