# Ansible automation

All cluster operations are driven by four Ansible playbooks in the `ansible/` directory. This page is a reference for what each playbook does, which inventory and variables it consumes, and how to invoke it. For step-by-step procedures, see the guides linked under each playbook.

## Inventories and variable files

The playbooks read from two inventories and two variable files:

| File | Purpose |
|------|---------|
| `ansible/inventory_infra.ini` | Infrastructure inventory: node hostnames, `ansible_host`, `ansible_k3s_server_ip` / `ansible_k3s_agent_ip`, `connection_mode` (`eth` or `wlan`), `force_k3s_reinstall`. Used by the infrastructure and network-switch playbooks. |
| `ansible/inventory.ini` | Application inventory used by the application and dashboard playbooks. |
| `ansible/vars/infra-vars.yaml` | `k3s_setup_dir`, `default_node_labels`, and `node_interface_map` (hostname + connection mode → Linux interface name). |
| `ansible/vars/deployment-vars.yaml` | Application image sources (`main_ros_image`, `microros_image`, `web_ui_image`). |

> Warning: the values in `inventory_infra.ini` and `infra-vars.yaml` must agree. Update both files together.

## 1. Infrastructure playbook: `playbook-infra-airgap.yaml`

Provisions the K3s cluster in an air-gapped environment: installs K3s server and agents from the bundled assets, configures node networking and DNS, sets up the local Docker registry, and applies node labels.

Run it for initial cluster setup, adding nodes, replacing hardware, or a full reinstall (`force_k3s_reinstall=true`).

```bash
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
```

See [Full cluster setup](../getting-started/full-cluster-setup.md) for the complete procedure.

## 2. Network-switch playbook: `playbook-network-switch.yaml`

Reconfigures the cluster when network interfaces or IP addresses change. Updates node-ip settings and flannel interface bindings so all nodes can communicate on the new network.

```bash
uv run ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
```

See [Network switching](../operations/network-switching.md) for the full procedure, including the required inventory and `node_interface_map` updates.

## 3. Application playbook: `playbook-app.yaml`

Deploys and manages applications on the cluster: applies Kubernetes manifests and updates ConfigMaps from `config/robot_params.json`.

Deploy or update applications:

```bash
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
```

Force a full restart of all applications:

```bash
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

Note: the command without `force_restart` is intended for quickly updating mapping/PID values without restarting the applications.

## 4. Dashboard playbook: `playbook-dashboard-setup.yaml`

Installs the Kubernetes Dashboard, creates an admin user, and writes a login token to `dashboard-admin-token.txt` in the directory where the command runs. Each run refreshes the token.

```bash
uv run ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
```

See [Set up the Kubernetes Dashboard](../getting-started/full-cluster-setup.md#7-set-up-the-kubernetes-dashboard) for access details.

## kubectl permissions

kubectl permissions are not configured automatically. After running the infrastructure or network-switch playbook, fix the kubeconfig:

```bash
bash kube_permission.sh
```

The script copies the K3s kubeconfig and sets ownership:

```bash
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER":"$USER" ~/.kube/config
```

## Related guides

- [Full cluster setup](../getting-started/full-cluster-setup.md) — initial installation end to end
- [Network switching](../operations/network-switching.md) — interface and IP changes