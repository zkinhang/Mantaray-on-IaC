https://mellow-cap-3e1.notion.site/ebd/28700ae3fb2281b3afd4f744baa0d396?v=28700ae3fb2281af9793000cdafe78d9

# Ansible Playbook Manual

You must perform these two steps every time you open a new terminal to work on this project:

1. **Navigate to the Project Root:** All commands must be run from the root of your project directory.
    
    ```
    cd ~/Desktop/mantaray_on_IaC
    ```
    
2. **Activate the Virtual Environment:** You must be inside your Python virtual environment so that your shell can find the `ansible` command and the required Kubernetes collections.
    
    ```
    source .venv/bin/activate
    ```
    

## 1. The Infrastructure Playbook: `playbook-infra.yaml`

- **What it does:** This playbook is to provision your physical hardware. It connects to your nodes via SSH, installs K3s, joins them to the cluster, and applies the correct Kubernetes labels (e.g., `ros2-hardware: land-pc`).
- **When to run it:**
    - **Once** during the initial setup of your entire cluster.
    - **Anytime** you add a new, blank node to the cluster.
    - **Anytime** you replace the hardware for an existing node (e.g., a Raspberry Pi fails and you replace it with a new one).

### How to Run:

1. **Manual Hardware Setup:**
    - Connect the new node to your network.
    - (Recommended) Log into your router and configure a **DHCP Reservation (Static IP)** for the new node.
    - Add the node's hostname (e.g., `new-robot.local`) to `ansible/inventory_infra.ini`.
    - Set up passwordless SSH from your main PC to the new node: `ssh-copy-id eec@new-robot.local`.
    - Set up passwordless sudo for all your nodes using `sudo visudo`
2. **Run the Playbook:**
    
    ```
    ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra.yaml
    
    ```
    
3. **Configure `kubectl` (First-Time Only):**
If this is the first time you've set up the server, you must copy the `kubeconfig` file so `kubectl` can access the cluster.
    
    ```
    mkdir -p ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown $USER:$USER ~/.kube/config
    chmod 600 ~/.kube/config
    ```
    

## 2. The Application Playbook: `playbook-app.yaml`

- **What it does:** This connects to your K3s cluster and ensures all your `Deployments`, `ConfigMaps`, and `Services` match the state defined in your files.
- **When to run it:**
    - To deploy a new code build (after running `playbook-build.yaml`).
    - To tune a parameter (after editing `config/robot_params.json`).
    - To force a full restart of all applications for testing.

### How to Run (Choose one scenario):

### Scenario A: Deploying a Code Change

*Run this after updating `vars/deployment-vars.yaml`.*

```
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
```

- **Result:** Ansible sees the new `image_tag` in your `Deployment` templates and performs a rolling update.

### Scenario B: Tuning a Parameter

*Run this after editing `config/robot_params.json`.*

```
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml
```

- **Result:** Ansible sees the `ConfigMap` has changed and triggers the `handler` to automatically restart *only* the affected pods (e..g., `pid-system`, `thrusterboard`).

### Scenario C: Forcing a Full Redeploy (For Testing)

*Run this when you want to restart all pods, even if nothing has changed.*

```
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

- **Result:** The `when: force_restart | bool` condition on the final task becomes true, and Ansible forces a rolling update of all deployments listed in `all_app_deployments`.

## 3. The Dashboard Playbook: `playbook-dashboard-setup.yaml`

- **What it does:** A one-time setup script that installs the Kubernetes Dashboard, creates a permanent admin user, and exposes the dashboard on your local network.
- **When to run it:** **Only once** when you first set up your cluster.

### How to Run:

1. **Run the Playbook:**
    
    ```
    ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
    ```
    
2. **Check the Output:** The playbook will print the URL and the path to your permanent token file.
    
    ```
    ok: [localhost] => {
        "msg": [
            "Dashboard setup is complete!",
            "Your permanent admin token has been saved to: ./dashboard-admin-token.txt",
            ...
            "Access the dashboard at this URL: [https://192.168.10.100:31234](https://192.168.10.100:31234)"
        ]
    }
    
    ```
    
3. **Log In:** Open the URL, get the token from `dashboard-admin-token.txt`, and save it in your password manager.