add / disable / modify deployments 

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

- add the distinction between running with and without force_restart=true

- add the "add / disable / modify deployments" content