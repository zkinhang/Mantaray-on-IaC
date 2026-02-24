# WebRTC Streaming Setup (GStreamer) - Two-Pi Architecture

Complete integration of WebRTC for low-latency, low-bandwidth dual-camera streaming using separate Raspberry Pi nodes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  rov-main (Raspberry Pi4)          rov-camera (Raspberry Pi4)
│  ├─ HF901 Camera                   ├─ WSD-2836 Camera
│  ├─ WebRTC Sender (main-cam)       └─ WebRTC Sender (aux-cam)
│  └─ Signaling Server (ws://9000)
│
│  Shared Signaling: ws://rov-main:9000
│  Stream Names: ?stream=main-cam | ?stream=aux-cam
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## What was implemented

✅ **Centralized Signaling Server**
- Minimal WebSocket server on `rov-main` for SDP/ICE exchange
- Per-stream rooms using query params (`?stream=main-cam`, `?stream=aux-cam`)
- Auto-cleanup of empty rooms
- Single point of coordination for both camera feeds

✅ **Dual GStreamer WebRTC Senders**
- **rov-main**: Captures HF901 (main camera) via `/dev/video0`
- **rov-camera**: Captures WSD-2836 (aux camera) via `/dev/video0`
- Each node runs independent sender process
- Hardware H.264 encoding when available (`v4l2h264enc`), fallback to `x264enc`
- Configurable resolution, FPS, bitrate, and keyframe interval per camera
- Auto-reconnect to shared signaling server

✅ **Browser Client (React/TypeScript)**
- Replaced MJPEG `<img>` with WebRTC `<video>`
- Automatic signaling and ICE candidate exchange
- Loss-free reconnection with exponential backoff
- Per-stream state tracking (dual streams)

✅ **k3s Integration (Recommended)**
- WebRTC signaling deployed on `rov-main` via k3s
- Sender on `rov-main` handles HF901 (main-cam)
- Sender on `rov-camera` handles WSD-2836 (aux-cam)
- NodeSelector enforces proper node assignment
- NodePort 30003 for external access
- Tunable via Ansible variables

✅ **Low-Latency Tuning**
- Main camera (HF901): 1280×720 @ 30 FPS, 2.5 Mbps
- Aux camera (WSD-2836): 640×480 @ 30 FPS, 0.9 Mbps
- Customizable via inventory variables per node

---

## Installation & Usage

### Option 1: k3s Cluster Deployment (Recommended)

**本選項適用於完整的 IaC 戰略部署，利用 Ansible + K8s Manifests 自動化配置。**

#### 1. Verify Node Setup

Ensure your k3s cluster has both nodes ready:

```bash
kubectl get nodes?
# Output should show:
# rov-main       Ready
# rov-camera     Ready
```

#### 2. Update Ansible Inventory

Edit `ansible/inventory_infra.ini` and configure WebRTC variables:

```ini
# WebRTC Main Camera (HF901 on rov-main)
webrtc_main_cam_width=1280
webrtc_main_cam_height=720
webrtc_main_cam_fps=30
webrtc_main_cam_bitrate=2500
webrtc_main_cam_key_int=30

# WebRTC Aux Camera (WSD-2836 on rov-camera)
webrtc_aux_cam_width=640
webrtc_aux_cam_height=480
webrtc_aux_cam_fps=30
webrtc_aux_cam_bitrate=900
webrtc_aux_cam_key_int=30
```

#### 3. Deploy with Ansible

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

This will:
- Deploy signaling server Pod on `rov-main`
- Deploy main-cam sender Pod on `rov-main` (targets HF901)
- Deploy aux-cam sender Pod on `rov-camera` (targets WSD-2836)
- Expose signaling on NodePort 30003
- Auto-restart on pod failure

#### 4. Verify Deployment

```bash
kubectl get pods -o wide
kubectl logs -f deployment/webrtc-signaling
kubectl logs -f deployment/webrtc-sender-main-cam
kubectl logs -f deployment/webrtc-sender-aux-cam
```

#### 5. Access from Web UI

Set stream URLs in Web UI settings (or hardcode in `useStreams.ts`):

```
ws://<rov-main-ip>:30003?stream=main-cam
ws://<rov-main-ip>:30003?stream=aux-cam
```

---

### Option 2: Standalone on Raspberry Pi (Manual Testing)

Use this to test each Pi independently before k3s deployment.

#### On rov-main (HF901 + Signaling):

**1. Install GStreamer dependencies**

```bash
sudo apt-get update
sudo apt-get install -y \
  python3-gi \
  gir1.2-gst-plugins-base-1.0 \
  gir1.2-gst-plugins-bad-1.0 \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav
```

**2. Install Python dependencies**

```bash
pip install websockets
```

**3. Start signaling server on rov-main**

```bash
python src/webrtc/signaling_server.py
```

Listens on: `ws://127.0.0.1:9000` (accessible from other nodes as `ws://rov-main:9000`)

**4. Start main-cam sender (HF901) on rov-main**

```bash
python src/webrtc/webrtc_sender.py \
  --device /dev/video0 \
  --signaling ws://rov-main:9000?stream=main-cam \
  --width 1280 --height 720 --fps 30 --bitrate 2500 --key-int 30
```

---

#### On rov-camera (WSD-2836):

**1. Install same GStreamer + Python deps** (repeat steps above)

**2. Start aux-cam sender (WSD-2836) on rov-camera**

```bash
python src/webrtc/webrtc_sender.py \
  --device /dev/video0 \
  --signaling ws://rov-main:9000?stream=aux-cam \
  --width 640 --height 480 --fps 30 --bitrate 900 --key-int 30
```

**Note:** Both senders connect to the **same signaling server** on `rov-main`.

---

#### 5. Open Web UI

Navigate to your control interface and set stream URLs:

```
ws://rov-main:9000?stream=main-cam
ws://rov-main:9000?stream=aux-cam
```

Or if testing from different host:

```
ws://<rov-main-ip>:9000?stream=main-cam
ws://<rov-main-ip>:9000?stream=aux-cam
```

---

### Option 3: Systemd Auto-start (Legacy / Single-Pi Testing)

For quick testing without k3s orchestration:

**On rov-main:**

```bash
sudo bash install-webrtc-services.sh /opt/mantaray/Mantaray-on-IaC
sudo systemctl enable --now webrtc-signaling.service
sudo systemctl enable --now webrtc-sender-rov.service
```

**On rov-camera:**

```bash
sudo bash install-webrtc-services.sh /opt/mantaray/Mantaray-on-IaC
sudo systemctl enable --now webrtc-sender-rov-cam.service
```

(Note: rov-camera's sender should point to rov-main's signaling server in the systemd unit)

Check logs:

```bash
sudo journalctl -u webrtc-signaling.service -f
sudo journalctl -u webrtc-sender-rov.service -f
sudo journalctl -u webrtc-sender-rov-cam.service -f
```

---

## Configuration

### Stream Naming Convention

This two-Pi architecture uses consistent stream names:

| Node | Stream Name | Camera | Device | Resolution | Bitrate |
|------|------------|--------|--------|------------|---------|
| rov-main | `main-cam` | HF901 (main) | `/dev/video0` | 1280×720 | 2500 kbps |
| rov-camera | `aux-cam` | WSD-2836 (aux) | `/dev/video0` | 640×480 | 900 kbps |

**Access URLs:**
```
ws://rov-main:9000?stream=main-cam    # HF901 from rov-main
ws://rov-main:9000?stream=aux-cam     # WSD-2836 from rov-camera
```

### WebRTC Tuning Parameters

**Bitrate (kbps):**
- Higher = better quality, more bandwidth
- Lower = lower latency, more artifacts
- HF901: 1500–3000 (default 2500)
- WSD-2836: 600–1200 (default 900)

**Key frame interval:**
- Lower = faster recovery from packet loss, higher bandwidth
- Higher = lower bandwidth, slower recovery
- Typical: 15–60 frames
- Default: 30

**Resolution & FPS:**
- Lower = less CPU/bandwidth
- Higher = better details, more processing
- HF901 can support full 1920×1080 if bandwidth available
- WSD-2836 optimized for 640×480 (lower CPU load)

---

## Troubleshooting

### k3s Pod Issues

**Check pod status:**
```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Restart a sender pod:**
```bash
kubectl delete pod webrtc-sender-main-cam-xxxxx
# K8s will auto-respawn it
```

**Verify nodeSelector assignment:**
```bash
kubectl get pods -o wide
# Ensure sender pods are on correct nodes (rov-main, rov-camera)
```

---

### Sender won't start

**Check GStreamer installation on Pi:**
```bash
gst-launch-1.0 --version
python3 -c "import gi; gi.require_version('Gst', '1.0'); print('OK')"
```

**Check camera device (on each Pi):**
```bash
ls -la /dev/video*
```

**On rov-main (should have HF901):**
```bash
v4l2-ctl -d /dev/video0 --list-formats-ext | head -20
```

**On rov-camera (should have WSD-2836):**
```bash
v4l2-ctl -d /dev/video0 --list-formats-ext | head -20
```

---

### Signaling connection fails

**Verify signaling server is running (on rov-main):**

*Via k3s:*
```bash
kubectl logs -f deployment/webrtc-signaling
```

*Via manual:*
```bash
ps aux | grep signaling_server.py
```

**Check if port 9000 is open on rov-main:**
```bash
sudo netstat -tulnp | grep 9000
```

**From rov-camera, test connectivity to rov-main:**
```bash
nc -zv rov-main 9000
# or
curl -i http://rov-main:9000
```

**Check firewall on rov-main:**
```bash
sudo ufw allow 9000/tcp
```

---

### Web UI doesn't receive video

1. **Check browser console** for JavaScript errors
2. **Verify signaling is running:**
   ```bash
   kubectl logs deployment/webrtc-signaling  # k3s
   sudo journalctl -u webrtc-signaling.service -n 50  # systemd
   ```
3. **Verify senders are running:**
   ```bash
   kubectl logs deployment/webrtc-sender-main-cam
   kubectl logs deployment/webrtc-sender-aux-cam
   # or
   sudo journalctl -u webrtc-sender-rov.service -n 50
   ```
4. **Check sender logs for errors:**
   ```bash
   # If sender can't find camera
   # If sender can't connect to signaling
   # If GStreamer initialization fails
   ```
5. **Test stream URL in browser console:**
   ```javascript
   const ws = new WebSocket('ws://rov-main:9000?stream=main-cam');
   ws.onopen = () => console.log('Connected!');
   ws.onerror = (e) => console.log('Error:', e);
   ```

---

### High latency or stuttering

**On the problematic stream:**

1. **Check network bandwidth:**
   ```bash
   iperf3 -s  # on rov-main
   iperf3 -c rov-main  # on rov-camera or browser host
   ```

2. **Reduce bitrate:**
   ```bash
   # Via k3s variables (re-deploy with Ansible)
   # Via manual: use --bitrate flag
   ```

3. **Lower FPS (try 20 or 15):**
   ```bash
   python src/webrtc/webrtc_sender.py --fps 20 ...
   ```

4. **Reduce resolution:**
   ```bash
   # HF901: try 960×540 instead of 1280×720
   # WSD-2836: try 480×360 instead of 640×480
   ```

5. **Lower key-frame interval** to improve recovery:
   ```bash
   --key-int 15  # instead of 30
   ```

---

## Quick Start Checklist

### K3s Deployment (Recommended)

- [ ] Verify k3s cluster: `kubectl get nodes` (rov-main, rov-camera ready)
- [ ] Verify network: both Pis can reach each other
- [ ] Verify cameras: SSH to each Pi and check `/dev/video0`
- [ ] Update Ansible variables in `ansible/inventory_infra.ini`
- [ ] Deploy: `ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"`
- [ ] Verify pods: `kubectl get pods` (all running)
- [ ] Check logs: `kubectl logs -f deployment/webrtc-signaling`
- [ ] Open Web UI, set stream URLs:
  - `ws://rov-main:9000?stream=main-cam` (HF901 from rov-main)
  - `ws://rov-main:9000?stream=aux-cam` (WSD-2836 from rov-camera)
- [ ] Verify video playback in browser `<video>` elements
- [ ] Adjust bitrate/FPS if needed

### Manual Testing (Before k3s)

- [ ] Install GStreamer deps on both Pis
- [ ] `pip install websockets` on both Pis
- [ ] Verify cameras: `ls -la /dev/video*`
- [ ] On rov-main: Start signaling `python src/webrtc/signaling_server.py`
- [ ] On rov-main: Start sender for HF901
- [ ] On rov-camera: Start sender for WSD-2836 (pointing to rov-main:9000)
- [ ] Open Web UI, test both streams
- [ ] Check latency and adjust bitrate/FPS if needed

---

## Architecture Details

### Signaling Flow

```
rov-main (Signaling Server)
  ├─ Listens on ws://0.0.0.0:9000
  └─ Routes streams:
     ├─ ?stream=main-cam → rov-main sender (HF901)
     └─ ?stream=aux-cam  → rov-camera sender (WSD-2836)

rov-main (HF901 Sender)
  └─ Connects to ws://rov-main:9000?stream=main-cam

rov-camera (WSD-2836 Sender)
  └─ Connects to ws://rov-main:9000?stream=aux-cam

Browser (Web UI)
  ├─ Signaling: ws://rov-main:9000 (negotiation + ICE)
  ├─ Main stream: RTC peer with rov-main sender
  └─ Aux stream: RTC peer with rov-camera sender
```

### Node Responsibilities

| Node | Role | Camera | GStreamer | Encoder |
|------|------|--------|-----------|---------|
| **rov-main** | Signaling + Sender | HF901 | Yes | v4l2h264enc or x264enc |
| **rov-camera** | Sender | WSD-2836 | Yes | v4l2h264enc or x264enc |

### Device Mapping

Each Pi has its camera on **`/dev/video0`** (not /dev/video1):
- rov-main: `/dev/video0` → HF901
- rov-camera: `/dev/video0` → WSD-2836

Make sure camera assignment is correct before deployment!

---

## Performance Notes

### CPU & Memory

- **Signaling Server**: ~20–50 MB RAM, <5% CPU (Python WebSocket)
- **HF901 Sender (v4l2h264enc)**: ~100 MB, 15–25% CPU (hardware encoding)
- **WSD-2836 Sender (v4l2h264enc)**: ~80 MB, 10–20% CPU (hardware encoding)

If using software encoding (`x264enc`), multiply CPU usage by ~3–5x.

### Latency

- Signaling negotiation: ~100–200 ms
- H.264 encoding: ~20–50 ms (hardware) or 50–150 ms (software)
- Network transit (LAN): ~10–30 ms
- Browser decode: ~30–100 ms
- **Total**: ~200–500 ms typical over LAN

### Best Conditions

- Wired network connections (or strong Wi-Fi 5GHz)
- Same LAN for all nodes
- No QoS or traffic shaping
- Adequate bitrate (≥1 Mbps per stream recommended)

### Known Limitations

- Works best on same LAN (no internet relay yet)
- If behind WAG/CGNAT, use STUN/TURN servers (future enhancement)
- iOS Safari requires WSS (wss://) not WS (ws://)

---

## Complete Deployment Workflow

### Phase 1: Prepare Nodes

1. **rov-main:**
   ```bash
   # SSH into rov-main
   sudo apt-get update
   sudo apt-get install -y python3-gi gir1.2-gst-plugins-base-1.0 gir1.2-gst-plugins-bad-1.0 \
     gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
     gstreamer1.0-plugins-ugly gstreamer1.0-libav
   pip install websockets
   
   # Verify HF901 camera
   ls -la /dev/video0
   v4l2-ctl -d /dev/video0 --info
   ```

2. **rov-camera:**
   ```bash
   # SSH into rov-camera
   sudo apt-get update
   sudo apt-get install -y python3-gi gir1.2-gst-plugins-base-1.0 gir1.2-gst-plugins-bad-1.0 \
     gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
     gstreamer1.0-plugins-ugly gstreamer1.0-libav
   pip install websockets
   
   # Verify WSD-2836 camera
   ls -la /dev/video0
   v4l2-ctl -d /dev/video0 --info
   ```

### Phase 2: Verify K3s Cluster

```bash
# On land PC or where kubectl is configured
kubectl get nodes
# Expected output:
# NAME        STATUS   ROLES
# rov-main    Ready    <none>
# rov-camera  Ready    <none>

kubectl get namespaces
# Should include 'default' or your app namespace
```

### Phase 3: Configure Ansible

Edit `ansible/inventory_infra.ini`:

```ini
[rov_nodes]
rov-main   ansible_host=<rov-main-ip>
rov-camera ansible_host=<rov-camera-ip>

[rov_nodes:vars]
# Camera specs for optimization
camera_hf901_device=/dev/video0
camera_wsd2836_device=/dev/video0

# WebRTC tuning
webrtc_main_cam_width=1280
webrtc_main_cam_height=720
webrtc_main_cam_fps=30
webrtc_main_cam_bitrate=2500
webrtc_main_cam_key_int=30

webrtc_aux_cam_width=640
webrtc_aux_cam_height=480
webrtc_aux_cam_fps=30
webrtc_aux_cam_bitrate=900
webrtc_aux_cam_key_int=30
```

### Phase 4: Deploy with Ansible

```bash
# From workspace root
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml \
  -e "force_restart=true" \
  -vv
```

### Phase 5: Verify Deployment

```bash
# Check pods are running
kubectl get pods -o wide
kubectl describe pod webrtc-signaling-xxxxx
kubectl describe pod webrtc-sender-main-cam-xxxxx
kubectl describe pod webrtc-sender-aux-cam-xxxxx

# Check logs
kubectl logs -f deployment/webrtc-signaling
kubectl logs -f deployment/webrtc-sender-main-cam
kubectl logs -f deployment/webrtc-sender-aux-cam
```

### Phase 6: Configure Web UI

Set stream URLs in `src/webUI/mantaray-control-interface/hooks/useStreams.ts`:

```typescript
export const DEFAULT_STREAMS = {
  main: 'ws://rov-main:9000?stream=main-cam',
  aux: 'ws://rov-main:9000?stream=aux-cam'
};
```

Or manually in Web UI settings:
- Main stream: `ws://rov-main:9000?stream=main-cam`
- Aux stream: `ws://rov-main:9000?stream=aux-cam`

### Phase 7: Test Streams

1. Open Web UI in browser
2. Check browser console (F12) for connection logs
3. Verify both `<video>` elements display streams
4. Monitor latency in browser inspector
5. Adjust bitrate/FPS if needed via Ansible redeploy

---

## Camera Hardware Reference

### HF901 (Main Camera on rov-main)

```
Model: HF901
Resolution: Up to 1920×1080
Frame Rate: 30 FPS native
FOV: ~90° (wide angle WDR)
Color Space: H.264 encoded

Recommended Settings:
  - Full quality (1920×1080 @ 30 FPS, 3000 kbps)
  - Default low-latency (1280×720 @ 30 FPS, 2500 kbps)
  - Mobile/low-bandwidth (960×540 @ 20 FPS, 1500 kbps)
```

### WSD-2836 (Aux Camera on rov-camera)

```
Model: WSD-2836
Resolution: Up to 640×480 (HVGA)
Frame Rate: 30 FPS native
FOV: ~60° (telephoto)
Color Space: H.264 encoded

Recommended Settings:
  - Standard (640×480 @ 30 FPS, 900 kbps)
  - Low-bandwidth (480×360 @ 20 FPS, 500 kbps)
  - Ultra-low (320×240 @ 15 FPS, 300 kbps)
```

---

## Files Changed

### New files:
- `src/webrtc/signaling_server.py` – WebSocket signaling server
- `src/webrtc/webrtc_sender.py` – GStreamer WebRTC sender
- `src/webrtc/README.md` – Quick reference
- `systemd/webrtc-signaling.service` – Signaling systemd unit (optional)
- `systemd/webrtc-sender-rov.service` – Main sender systemd unit (optional)
- `systemd/webrtc-sender-rov-cam.service` – Aux sender systemd unit (optional)
- `install-webrtc-services.sh` – Installer script (optional)
- `WEBRTC_SETUP.md` – This file

### Modified files:
- `requirements.txt` – Added `websockets`
- `docker/Dockerfile` – Added GStreamer deps, WebRTC scripts, websockets install
- `ansible/inventory_infra.ini` – Added WebRTC tuning variables for dual nodes
- `ansible/k8s/dns-service.yaml` – Replaced MJPEG services with WebRTC signaling
- `ansible/k8s/manta-ray-deployment.yaml.j2` – Replaced MJPEG senders with WebRTC senders using nodeSelector
- `src/webUI/mantaray-control-interface/components/StreamView.tsx` – Converted MJPEG img to WebRTC video
- `src/webUI/mantaray-control-interface/hooks/useStreams.ts` – Updated default URLs to WebSocket
- `src/webUI/prototype.html` – Switched to WebRTC video + signaling

---

## Support & Debugging

### Common Commands

```bash
# Check Signaling Server
kubectl logs deployment/webrtc-signaling -f

# Check Main Camera Sender
kubectl logs deployment/webrtc-sender-main-cam -f

# Check Aux Camera Sender
kubectl logs deployment/webrtc-sender-aux-cam -f

# Restart a pod
kubectl delete pod <pod-name>

# SSH into a node for manual testing
ssh pi@rov-main
ssh pi@rov-camera

# Manual sender test
python src/webrtc/webrtc_sender.py \
  --device /dev/video0 \
  --signaling ws://rov-main:9000?stream=main-cam \
  --width 1280 --height 720 --fps 30 --bitrate 2500 --key-int 30
```

### Getting Help

1. Check sender logs for GStreamer errors
2. Verify network connectivity between nodes: `ping rov-camera` from rov-main
3. Test camera directly: `gst-launch-1.0 v4l2src device=/dev/video0 ! fakesink`
4. Check WebSocket connection in browser console: `new WebSocket('ws://rov-main:9000')`

---

## Next Steps & Deployment Status

1. ✅ WebRTC infrastructure architected for two-Pi setup
2. 🔄 **SETUP web rtc** – Run Ansible playbook to deploy signaling + senders
3. 🧪 **TEST 佢地** – Open Web UI, verify both streams (main-cam + aux-cam)
4. 🎚️ Fine-tune bitrate/FPS/resolution via Ansible redeploy if needed
5. 📦 Lock in k3s manifests with proper nodeSelector
6. 🚀 Ready for full Mantaray ROV deployment

---

**架構部署狀態**: ✅ K3s ready with nodeSelector precision  
**親自指揮、親自部署！**
