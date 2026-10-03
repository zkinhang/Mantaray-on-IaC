## 1. Run Network Switch Playbook: `playbook-network-switch.yaml`

**What it does:** Reconfigures the cluster when network interfaces or IP addresses change. Updates node-ip settings, flannel interface bindings, and ensures all nodes can communicate on the new network.

**When to run it:**
- Changing the network interface (e.g., `eth0` → `wlan0`)
- Changing node IP addresses
- Switching between networks
- **Encountered into any network connection issue, run this playbook to reconfigure it.**

### Variables

Update in `ansible/inventory_infra.ini`:

| Variable | Description |
|----------|-------------|
| `connection_mode` | Network interface to use, "wlan" or "eth" |
| `ansible_k3s_server_ip` | New IP address for the K3s server |
| `ansible_k3s_agent_ip` | New IP addresses for agent nodes |
| `ansible_host` | New IP addresses for server/agents, follow the exact the same in the line |

Note: To obtain the ip addresses, you can use “ip addr show" or simply check it from router page, and recommended to assign static ip address for all the nodes.

### How to Run

```bash
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
```

### Post-Network Switch: Fix Kubernetes Permissions

After running this playbook, you **must** fix kubectl permissions:

```bash
bash kube_permission.sh
```

## 2. Run Dashboard Playbook: `playbook-dashboard-setup.yaml`

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

Please refer back to [Set up the Kubernetes Dashboard](../getting-started/full-cluster-setup.md#7-set-up-the-kubernetes-dashboard)

---
## Typical Testing Workflow

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
