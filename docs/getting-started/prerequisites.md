# Prerequisites

This is a checklist page of the control workstation and cluster nodes are ready before beginning a deployment. For a command-by-command Ubuntu setup, see [Ubuntu workstation setup](ubuntu-workstation-setup.md).

## Hardware

- A control workstation running Ubuntu. A virtual machine can be used for evaluation, provided it can reach every cluster node over the selected network.
- For the standard deployment: one x86_64 land PC and two ARM64 ROV nodes (such as Raspberry Pis).
- Enough disk space for the bundled K3s air-gap images, Docker images, and the local registry. The `k3s-setup/files/` directory is part of the installation input and must remain available on the control workstation.

## Software on the control workstation

- Git and Git LFS
- Python 3.12 or later and [uv](https://docs.astral.sh/uv/)
- Docker runtime
- OpenSSH client; install and enable OpenSSH Server when the workstation is also a K3s node

Install the project's Python tools after cloning the repository:

```bash
uv sync
```

## Access and networking

- Each enabled node must have a stable, reachable IP address on the chosen Ethernet or Wi-Fi network.
- The Ansible control account must be able to SSH to every enabled node using the username and addresses in `ansible/inventory_infra.ini`.
- Passwordless SSH and `sudo` so Ansible can connect non-interactively. 
- The inventory's `connection_mode` and the matching interface names in `ansible/vars/infra-vars.yaml` must agree.

## Optional remote desktop access

If you would like to access the Ubuntu workstation over network and cross-platform, set up GNOME Remote Desktop before deploying. See [Connect to Ubuntu from Windows](ubuntu-remote-desktop.md).
