# Offline / Air-Gap mode  
  
In `eth` mode the ROV nodes have no internet access, so all container images are served by a local Docker registry on the K3s server. This page explains how that registry works; for the image-copy procedure see [Updating images](../operations/updating-images.md).  
  
## Local registry  
  
`playbook-infra-airgap.yaml` runs a `registry:2` container on the K3s server, listening on port `5000` with data persisted at `/opt/local-registry` (`registry_port` and `registry_data_dir` in `ansible/vars/infra-vars.yaml`). It is reachable as `mantaray.local:5000`.  
  
The registry serves plain HTTP, so every node is configured to trust it:  
  
- Docker: `insecure-registries` entries in `/etc/docker/daemon.json`  
- containerd/K3s: mirror endpoints with `insecure_skip_verify` in `/etc/rancher/k3s/registries.yaml`  
  
Both are written by the playbook and trigger Docker/K3s restarts via handlers.  
  
## Air-gapped K3s installation  
  
The K3s binary and images are bundled in `k3s-setup/` via Git LFS — `git lfs pull` is required before running the infrastructure playbook with `force_k3s_reinstall=true`.  
  
## Copying images in  
  
CI pushes only to DockerHub; syncing to the local registry is a manual `skopeo copy` step that must run where both DockerHub and `mantaray.local:5000` are reachable (typically `wlan` mode or the land PC). See [Updating images §2](../operations/updating-images.md#2-sync-images-to-the-local-registry).  
  
## Related guides  
  
- [Updating images](../operations/updating-images.md)  
- [Full cluster setup §3 — image source](../getting-started/full-cluster-setup.md#3-select-the-application-image-source)  
- [Architecture — Offline / Air-Gap Mode](../architecture.md#offline--air-gap-mode)