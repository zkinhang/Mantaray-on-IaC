3-node production setup (Steps 1–6)  

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
---

## Important Notes

### Kubernetes Permission Issue

Currently, kubectl permissions are not automatically configured. **You must run the following after any cluster configuration:**

```bash
bash kube_permission.sh
```