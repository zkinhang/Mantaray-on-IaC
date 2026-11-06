# Offline / Air-Gap mode  
  
In `eth` mode the ROV nodes have no internet access, so all container images are served by a local Docker registry on the K3s server. This page explains how that registry works; for the image-copy procedure see [Updating images](../operations/updating-images.md).  
  
## Local registry  
  
The registry is provisioned automatically by `playbook-infra-airgap.yaml` — no manual setup is required. It runs as a `registry:2` container named `local-registry` on the K3s server, with `restart_policy: always`, port `5000`, and image data persisted at `/opt/local-registry` on the host. Both values are configurable via `registry_port` and `registry_data_dir` in `ansible/vars/infra-vars.yaml`. It is reachable as `mantaray.local:5000` (or `<server-ip>:5000`).  
  
The registry serves plain HTTP, so the playbook also configures every node to trust it:  
  
- Docker: `insecure-registries` entries in `/etc/docker/daemon.json` (triggers a Docker restart)  
- containerd/K3s: HTTP mirror endpoints with `insecure_skip_verify` in `/etc/rancher/k3s/registries.yaml` (triggers a K3s restart) 
  
Both are written by the playbook and trigger Docker/K3s restarts via handlers.  
  
### Troubleshooting  
  
- Check the container on the server: `docker ps | grep local-registry`  
- Check stored images: `ls /opt/local-registry/docker/registry/v2/repositories/`  
- Query the catalog from any node: `curl http://mantaray.local:5000/v2/_catalog`  
- If pulls fail with TLS errors, verify `/etc/rancher/k3s/registries.yaml` and `/etc/docker/daemon.json` exist on the node, re-running the infrastructure playbook rewrites them.

## Air-gapped K3s installation  
  
The K3s binary and images are bundled in `k3s-setup/` via Git LFS — `git lfs pull` is required before running the infrastructure playbook with `force_k3s_reinstall=true`.  
  
## Copying images in  
  
CI pushes only to DockerHub; syncing to the local registry is a manual `skopeo copy` step that must run where both DockerHub and `mantaray.local:5000` are reachable (typically `wlan` mode or the land PC). See [Updating images §2](../operations/updating-images.md#2-sync-images-to-the-local-registry).  
  
## Related guides  
  
- [Updating images](../operations/updating-images.md)  
- [Full cluster setup §3 — image source](../getting-started/full-cluster-setup.md#3-select-the-application-image-source)  
- [Architecture — Offline / Air-Gap Mode](../architecture.md#offline--air-gap-mode)