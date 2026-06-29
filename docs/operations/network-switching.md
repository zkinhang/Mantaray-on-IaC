ETH ↔ WLAN, what to change in inventory + infra-vars  

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

- Add the two things that must change together: connection_mode + IPs in inventory_infra.ini, and interface names in ansible/vars/infra-vars.yaml

