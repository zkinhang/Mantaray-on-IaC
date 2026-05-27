# Troubleshooting Guide

This guide covers common issues and resolutions in the Mantaray-on-IaC environment.

## 1. Kubernetes Issues

### `Error from server (Forbidden): nodes is forbidden`
- **Cause**: The `kubeconfig` is out of sync or permissions were reset after a cluster re-initialization.
- **Fix**: Run `bash kube_permission.sh` from the project root.

### `ImagePullBackOff` or `ErrImagePull`
- **Cause**: The local registry at `mantaray.local:5000` is unreachable, or the image hasn't been pushed.
- **Fix**:
  - Verify registry: `curl http://mantaray.local:5000/v2/_catalog`
  - Check Node connectivity: `ping mantaray.local` from the node having the issue.

## 2. Hardware and Connectivity

### Camera Stream Not Loading
- **Cause**: Hardware path changed (e.g., `/dev/video0` to `/dev/video1`) or GStreamer pipeline failure.
- **Fix**:
  - Check `ansible/vars/hardware-paths.yaml` for correct device mappings.
  - Verify device presence on host: `ls /dev/video*`

### Thruster Communication Failure
- **Cause**: Serial permissions or wrong baud rate.
- **Fix**:
  - Just reboot the ROV or delete the corresponding pod to reset the serial connection.
  - Ensure `privileged: true` is set in the deployment.
  - Verify serial device is mapped correctly in `manta-ray-deployment.yaml.j2`.

## 3. Ansible Failures

### `ErrImagePull` or `ImagePullBackOff` on multiple pods
- **Cause**: IP address of the land PC (registry host) has changed, or network interfaces have switched.
- **Fix**: 
  - Update `ansible/inventory_infra.ini` and `ansible/inventory.ini` with the new IPs.
  - Run `ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml`. This is faster and safer than a full reinstall.
  - Run `bash kube_permission.sh`.

### SSH Connection Refused
- **Cause**: SSH service not started or wrong IP in `inventory.ini`.
- **Fix**:
  - Try to clean your existing DNS mapping in /etc/hosts: `sudo nano /etc/hosts` and remove any old entries for `mantaray.local`, `rov.local`, or `rov-cam.local`. (DO NOT REMOVE OTHERS)
  - Verify IP by pinging the node: `ping mantaray.local` `ping rov.local` `ping rov-cam.local`
  - Check SSH state: `sudo systemctl status ssh`
