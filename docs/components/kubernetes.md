# Kubernetes manifests

All cluster workloads are defined in `ansible/k8s/` as Jinja2 templates and static manifests, rendered and applied by `playbook-app.yaml`. This page is a reference for each file and for the Deployment structure they share. For the design rationale (host networking, node pinning, privileged pods) see [Architecture — Layer 3](../architecture.md#layer-3--kubernetes-orchestration-ansiblek8s).

## File inventory

| File | Contents | Applied by |
|------|----------|------------|
| `manta-ray-deployment.yaml.j2` | All application `Deployment` documents | `playbook-app.yaml` |
| `robot-configmap.yaml.j2` | `robot-parameters` ConfigMap rendered from `ansible/config/robot_params.json` | `playbook-app.yaml` |
| `dns-service.yaml` | `NodePort` services exposing the streamers and web UI | `playbook-app.yaml` |
| `dashboard-setup.yaml` | Dashboard `ServiceAccount`, `ClusterRoleBinding`, token `Secret` | `playbook-dashboard-setup.yaml` |
| `cluster-services/dashboard-source.yaml` | Upstream Kubernetes Dashboard manifest | `playbook-dashboard-setup.yaml` |

## Services and ports

`dns-service.yaml` defines three `NodePort` services — the only cluster entry points, since all ROS2 pods use `hostNetwork` and need no Service:

| Service | NodePort | Exposes |
|---------|----------|---------|
| `rov-streamer-service` | `30001` | `webrtc-streamer-a` (camera A stream, port 8080) |
| `rov-cam-streamer-service` | `30002` | `webrtc-streamer-b` (camera B stream, port 8080) |
| `webui-service` | `30080` | `webui` (control interface, port 80) |

Access them at `http://<node-ip>:<nodePort>` — e.g., the web UI at `http://mantaray.local:30080`.

## Deployments in `manta-ray-deployment.yaml.j2`

The template defines ten `Deployment` documents, applied unconditionally by `playbook-app.yaml`:

| Deployment | Node (`ros2-hardware`) | Image | Runs | Notable spec |
|------------|----------------------|-------|------|--------------|
| `controller-deployment` | `land-pc` | `main_ros_image` | `ros2 run controller_pkg joystick_reader` | `privileged`, mounts `/dev/input` for the joystick |
| `receiver-deployment` | `land-pc` | `main_ros_image` | `receiver_pkg decomposer` with `/config/params.yaml` | Mounts `robot-parameters` ConfigMap at `/config` and the thrusterboard API source |
| `foxglove-bridge-deployment` | `land-pc` | `main_ros_image` | `foxglove_bridge` on port 8765 | — |
| `rosbridge-server-deployment` | `land-pc` | `main_ros_image` | `rosbridge_websocket_launch.xml` | Exposes `containerPort: 9090` (websocket) |
| `msg-converter-deployment` | `land-pc` | `main_ros_image` | `control_system_pkg msg_converter` | — |
| `webrtc-streamer-a-deployment` | `rov-main` | `main_ros_image` | `webrtc_streamer.py` at 640×480@60 | `privileged`, mounts `{{ path_a_camera }}`; no `hostIPC` |
| `webrtc-streamer-b-deployment` | `rov-camera` | `main_ros_image` | `webrtc_streamer.py` at 1920×1080@60 | `privileged`, mounts `{{ path_b_camera }}`; no `hostIPC` |
| `thrusterboard-deployment` | `rov-main` | `main_ros_image` | `launch_thruster.py` with `params_file:=/config/params.yaml` | `privileged`, mounts `/dev`, ConfigMap, and thrusterboard API; has a `livenessProbe` on the `/imu` topic |
| `pid-system-deployment` | `rov-main` | `main_ros_image` | `control_system_pkg pid_system_node` with `/config/params.yaml` | `privileged`, mounts `{{ path_imu }}` and the ConfigMap |
| `microros-agent-deployment` | `rov-camera` | `microros_image` | `esptool` flash + `micro_ros_agent serial` on `{{ path_microros_serial }}` | `privileged`, `imagePullPolicy: Always`, mounts `/dev` |
| `webui-deployment` | `land-pc` | `web_ui_image` | Web control interface on port 80 | `imagePullPolicy: Always`; the only pod **without** `hostNetwork` — reached via `webui-service` NodePort 30080 |

## Anatomy of a Deployment

Every deployment in the template follows the same structure. Annotated using `thrusterboard-deployment`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thrusterboard-deployment      # resource name — used by kubectl, all_app_deployments, and the ConfigMap restart handler
spec:
  replicas: 1                         # always 1 — each pod is pinned to specific hardware, so scaling is meaningless
  selector:
    matchLabels:
      app: thrusterboard              # tells the Deployment which pods it owns; must equal template.metadata.labels
  template:
    metadata:
      labels:
        app: thrusterboard            # the label applied to each pod — Services and selectors match on this
    spec:
      nodeSelector:
        ros2-hardware: rov-main       # pins the pod to the node carrying this label (applied by the infra playbook)
      hostNetwork: true               # pod shares the node's network namespace — required for ROS2/DDS multicast discovery
      hostIPC: true                   # pod shares the node's IPC namespace — required for DDS shared-memory transport
      volumes:
      - name: serial-port
        hostPath:
          path: /dev                  # maps a host path into the pod — how hardware devices are exposed
      - name: parameter-volume
        configMap:
          name: robot-parameters      # rendered from ansible/config/robot_params.json by robot-configmap.yaml.j2
      - name: thrusterboard-api-source
        hostPath:
          path: "{{ path_thrusterboard_api }}"   # Jinja2 variable from ansible/vars/hardware-paths.yaml
      containers:
      - name: thrusterboard-container
        image: "{{ main_ros_image }}" # Jinja2 variable from ansible/vars/deployment-vars.yaml
        command: ["/bin/bash", "-c"]  # wraps the ROS2 command in a shell so env setup and chaining work
        args:
          - >
            source install/setup.bash &&
            ros2 launch /ros2_ws/src/launch_file/launch_thruster.py params_file:=/config/params.yaml
        env:
        - name: ROS_DOMAIN_ID
          value: "0"                  # all pods must share the same DDS domain or they won't discover each other
        securityContext:
          privileged: true            # required for direct hardware access (serial, GPIO, /dev devices)
        livenessProbe:
          exec:
            command: ["/bin/bash", "-c", "source /ros2_ws/install/setup.bash && ros2 topic hz /imu | grep -v 'average rate: 0.000'"]
          initialDelaySeconds: 30
          periodSeconds: 15            # kubelet restarts the container if the probe fails
        volumeMounts:
        - name: serial-port
          mountPath: /dev
        - name: parameter-volume
          mountPath: /config
          readOnly: true
        - name: thrusterboard-api-source
          mountPath: "{{ path_thrusterboard_mounting }}"
```

### Field patterns across all deployments

| Field | Pattern | Why |
|-------|---------|-----|
| `metadata.name` | `<component>-deployment` | Referenced by `all_app_deployments`, the ConfigMap restart handler, and `kubectl` commands — keep names consistent |
| `selector.matchLabels` / `template.metadata.labels` | Identical `app: <component>` | The selector binds the Deployment to its pods; a mismatch means the Deployment manages nothing |
| `replicas` | Always `1` | Pods are hardware-pinned; a second replica would fight for the same devices |
| `hostNetwork` + `hostIPC` | `true` on every ROS2 pod | DDS discovery uses multicast and shared memory — both require host namespaces. `webui` is the only exception (reached via a NodePort Service instead); the two `webrtc-streamer` pods set `hostNetwork` but not `hostIPC` |
| `nodeSelector` | `ros2-hardware: land-pc` / `rov-main` / `rov-camera` | Pins each pod to the node with its hardware; labels are set by the infra playbook from `default_node_labels` in `infra-vars.yaml` |
| `image` | `{{ main_ros_image }}` / `{{ microros_image }}` / `{{ web_ui_image }}` | Jinja2 variables rendered from `deployment-vars.yaml` — never hardcode a tag |
| `command`/`args` | Either direct `args: ["ros2", "run", ...]` or `bash -c` sourcing the workspace first | The images don't set a ROS2 entrypoint, so pods that need shell chaining source `install/setup.bash` themselves |
| `env.ROS_DOMAIN_ID` | `"0"` everywhere | DDS domain must match across all nodes |
| `securityContext.privileged` | `true` on hardware-touching pods | Grants device access; pure-software pods (foxglove, rosbridge, msg-converter) omit it |
| `volumeMounts`/`volumes` | `hostPath` for devices (paths from `hardware-paths.yaml`), `configMap` for `robot-parameters` | Two mount types only: hardware access and parameters |
| `livenessProbe` | `ros2 topic hz`/`echo` on a topic the node publishes | Restarts the container if the ROS node dies silently — only thrusterboard uses one today |

### Known quirks

- **Duplicate `livenessProbe` in `thrusterboard-deployment`** — the container defines the key twice (a `ros2 topic echo /imu --once` probe, then a `ros2 topic hz /imu` probe). YAML keeps only the last key, so the `echo` probe is dead code.
- **`imagePullPolicy: Always` is inconsistent** — only `microros-agent` and `webui` set it; the other eight use the default. With `:latest` tags this makes no practical difference, but it will matter if version tags are ever pinned.

## Template variables

`manta-ray-deployment.yaml.j2` injects variables at render time:

- Image references from `ansible/vars/deployment-vars.yaml` (`main_ros_image`, `microros_image`, `web_ui_image`)
- Device paths from `ansible/vars/hardware-paths.yaml` (`path_a_camera`, `path_b_camera`, `path_imu`, `path_microros_serial`, `path_thrusterboard_api`, `path_thrusterboard_mounting`)

Every `Deployment` in the template is applied unconditionally — there is no enable/disable flag. See [Managing applications](../operations/managing-applications.md) for add/remove procedures.

## K3s specifics

- The cluster runs **K3s** (not upstream Kubernetes); the kubeconfig is `/etc/rancher/k3s/k3s.yaml` on the server, copied to `~/.kube/config` by `kube_permission.sh`.
- Pod networking uses K3s's default **flannel** CNI — `playbook-network-switch.yaml` rebinds flannel's interface when `connection_mode` changes.
- Node labels (`ros2-hardware: land-pc` / `rov-main` / `rov-camera`) are applied by the infrastructure playbook and drive every pod's `nodeSelector`.

## Dashboard

`playbook-dashboard-setup.yaml` applies `cluster-services/dashboard-source.yaml` (upstream Dashboard) plus `dashboard-setup.yaml` (admin `ServiceAccount` + `ClusterRoleBinding` + token `Secret`), and writes the login token to `dashboard-admin-token.txt`. See [Full cluster setup §7](../getting-started/full-cluster-setup.md#7-set-up-the-kubernetes-dashboard).

## Related guides

- [Managing applications](../operations/managing-applications.md)
- [Configuration updates](../operations/configuration-updates.md)
- [Ansible automation](ansible-automation.md)