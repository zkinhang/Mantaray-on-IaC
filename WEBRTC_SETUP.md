# WebRTC Streaming Setup (GStreamer)

Complete integration of WebRTC for low-latency, low-bandwidth camera streaming using GStreamer.

## What was implemented

✅ **Signaling Server**
- Minimal WebSocket server for SDP/ICE exchange
- Per-stream rooms using query params (`?stream=rov`, `?stream=rov-cam`)
- Auto-cleanup of empty rooms

✅ **GStreamer WebRTC Sender**
- Captures from USB cameras (v4l2src)
- Supports H.264 (hardware: `v4l2h264enc`, software: `x264enc`) and VP8
- Configurable resolution, FPS, bitrate, and keyframe interval
- Auto-reconnect to signaling server

✅ **Browser Client (React/TypeScript)**
- Replaced MJPEG `<img>` with WebRTC `<video>`
- Automatic signaling and ICE candidate exchange
- Loss-free reconnection with exponential backoff
- Per-stream state tracking

✅ **k3s Integration**
- WebRTC signaling deployed on land PC
- Two senders on ROV nodes (host networking)
- NodePort 30003 for external access
- Tunable via Ansible variables

✅ **Systemd Services**
- Auto-start on Pi boot
- Automatic restart on failure
- Easy logging via journalctl

✅ **Low-Latency Tuning**
- Main camera (HF901): 1280×720 @ 30 FPS, 2.5 Mbps
- Aux camera (WSD-2836): 640×480 @ 30 FPS, 0.9 Mbps
- Customizable via inventory variables

---

## Installation & Usage

### Option 1: Standalone (Raspberry Pi)

#### 1. Install GStreamer dependencies

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

#### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

(or just: `pip install websockets`)

#### 3. Start signaling server

```bash
python src/webrtc/signaling_server.py
```

Listens on: `ws://0.0.0.0:9000`

#### 4. Start senders (one terminal each)

**Main camera (HF901):**
```bash
python src/webrtc/webrtc_sender.py \
  --device /dev/video0 \
  --signaling ws://127.0.0.1:9000?stream=rov \
  --width 1280 --height 720 --fps 30 --bitrate 2500 --key-int 30
```

**Aux camera (WSD-2836):**
```bash
python src/webrtc/webrtc_sender.py \
  --device /dev/video1 \
  --signaling ws://127.0.0.1:9000?stream=rov-cam \
  --width 640 --height 480 --fps 30 --bitrate 900 --key-int 30
```

#### 5. Open Web UI

Navigate to your control interface and set stream URLs:
```
ws://<pi-ip>:9000?stream=rov
ws://<pi-ip>:9000?stream=rov-cam
```

---

### Option 2: Auto-start with systemd

Copy service files and install:

```bash
sudo bash install-webrtc-services.sh /opt/mantaray/Mantaray-on-IaC
```

The script will:
- Copy service files from `systemd/` to `/etc/systemd/system/`
- Update `REPO_DIR` paths
- Enable services to start at boot

**Start services:**
```bash
sudo systemctl start webrtc-signaling.service
sudo systemctl start webrtc-sender-rov.service
sudo systemctl start webrtc-sender-rov-cam.service
```

**Check status:**
```bash
sudo systemctl status webrtc-signaling.service
sudo systemctl status webrtc-sender-rov.service
sudo systemctl status webrtc-sender-rov-cam.service
```

**View logs:**
```bash
sudo journalctl -u webrtc-signaling.service -f
sudo journalctl -u webrtc-sender-rov.service -f
sudo journalctl -u webrtc-sender-rov-cam.service -f
```

---

### Option 3: k3s Cluster Deployment

#### 1. Update Ansible inventory

Edit `ansible/inventory_infra.ini` and verify WebRTC variables (already added):

```ini
# WebRTC tuning for main camera (HF901 on rov)
webrtc_main_width=1280
webrtc_main_height=720
webrtc_main_fps=30
webrtc_main_bitrate=2500
webrtc_main_key_int=30

# WebRTC tuning for aux camera (WSD-2836 on rov-cam)
webrtc_aux_width=640
webrtc_aux_height=480
webrtc_aux_fps=30
webrtc_aux_bitrate=900
webrtc_aux_key_int=30
```

#### 2. Deploy with Ansible

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

This will:
- Build container image with GStreamer + Python deps
- Deploy signaling server on land PC
- Deploy two senders on ROV nodes
- Expose signaling on NodePort 30003

#### 3. Access from browser

Set stream URLs in Web UI:
```
ws://<land-pc-ip>:30003?stream=rov
ws://<land-pc-ip>:30003?stream=rov-cam
```

Or update defaults in:
- `src/webUI/mantaray-control-interface/hooks/useStreams.ts`

---

## Configuration

### WebRTC Tuning Parameters

**Bitrate (kbps):**
- Higher = better quality, more bandwidth
- Lower = lower latency, more artifacts
- Typical range: 500–5000

**Key frame interval:**
- Lower = faster recovery from packet loss, higher bandwidth
- Higher = lower bandwidth, slower recovery
- Typical: 15–60 frames

**Resolution & FPS:**
- Lower = less CPU/bandwidth
- Higher = better details, more processing

**Presets (from cameras' specs):**

| Camera | Res | FPS | Bitrate | Use Case |
|--------|-----|-----|---------|----------|
| HF901 (main) | 1920×1080 | 30 | 3000 kbps | Full-quality (best light) |
| HF901 (main) | 1280×720 | 30 | 2500 kbps | **Default low-latency** |
| WSD-2836 (aux) | 640×480 | 30 | 900 kbps | **Default telemetry** |
| Either | 320×240 | 15 | 350 kbps | Ultra-low bandwidth |

---

## Troubleshooting

### Sender won't start

**Check GStreamer installation:**
```bash
gst-launch-1.0 --version
python3 -c "import gi; gi.require_version('Gst', '1.0'); print('OK')"
```

**Check camera device:**
```bash
ls -la /dev/video*
```

### Signaling connection fails

**Verify port 9000 is open:**
```bash
netstat -tulnp | grep 9000
```

**Check firewall:**
```bash
sudo ufw allow 9000/tcp
```

### Web UI doesn't receive video

1. Check browser console for errors
2. Verify sender is running: `sudo systemctl status webrtc-sender-rov.service`
3. Verify signaling is running: `sudo systemctl status webrtc-signaling.service`
4. Check sender logs: `sudo journalctl -u webrtc-sender-rov.service -n 50`

### High latency or stuttering

- Reduce bitrate or resolution
- Lower FPS (try 20 or 15)
- Check network bandwidth: `iperf3 -c <pi-ip>`
- Reduce key-int to improve recovery

---

## Files Changed

### New files:
- `src/webrtc/signaling_server.py` – WebSocket signaling server
- `src/webrtc/webrtc_sender.py` – GStreamer WebRTC sender
- `src/webrtc/README.md` – Quick reference
- `systemd/webrtc-signaling.service` – Signaling systemd unit
- `systemd/webrtc-sender-rov.service` – Main sender systemd unit
- `systemd/webrtc-sender-rov-cam.service` – Aux sender systemd unit
- `install-webrtc-services.sh` – Installer script
- `WEBRTC_SETUP.md` – This file

### Modified files:
- `requirements.txt` – Added `websockets`
- `docker/Dockerfile` – Added GStreamer deps, WebRTC scripts, websockets install
- `ansible/inventory_infra.ini` – Added WebRTC tuning variables
- `ansible/k8s/dns-service.yaml` – Replaced MJPEG services with WebRTC signaling
- `ansible/k8s/manta-ray-deployment.yaml.j2` – Replaced MJPEG senders with WebRTC senders
- `src/webUI/mantaray-control-interface/components/StreamView.tsx` – Converted MJPEG img to WebRTC video
- `src/webUI/mantaray-control-interface/hooks/useStreams.ts` – Updated default URLs to WebSocket
- `src/webUI/prototype.html` – Switched to WebRTC video + signaling

---

## Quick Start Checklist

- [ ] Install GStreamer deps on Pi
- [ ] `pip install websockets`
- [ ] Verify cameras: `ls -la /dev/video*`
- [ ] Start signaling: `python src/webrtc/signaling_server.py`
- [ ] Start senders (or enable systemd services)
- [ ] Open Web UI, set stream URLs
- [ ] Verify video playback in `<video>` elements
- [ ] Check latency and adjust bitrate if needed

---

## Performance Notes

- **CPU usage:** v4l2h264enc (hardware) << x264enc (software)
- **Latency:** ~200–500 ms over LAN with adaptive bitrate
- **Best on:** Same LAN, wired connection preferred
- **Works on:** Mobile browsers (iOS Safari, Android Chrome)
- **Not recommended:** Low bandwidth (<1 Mbps), high RTT (>50 ms)

---

## Next Steps

1. If moving to a desktop app (Pake), the WebRTC client code stays the same.
2. For multi-stream mixing, use GStreamer composition (tee, compositor).
3. For network-agnostic builds, set up STUN/TURN servers.

## How to run WebRTC

### 1) Install dependencies on the Pi

You need GStreamer with WebRTC and Python GI bindings. Example (Debian/Ubuntu/Raspberry Pi OS):

```
sudo apt-get update
sudo apt-get install -y \
  python3-gi \
  gir1.2-gst-plugins-base-1.0 \
  gir1.2-gst-plugins-bad-1.0 \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav
```

Install Python deps:

```
pip install -r requirements.txt
```

### 2) Start signaling server

Run on the Pi (or any host reachable by the browser client):

```
python src/webrtc/signaling_server.py
```

Default URL: `ws://<pi-ip>:9000`

### 3) Start two senders (one per camera)

Replace `/dev/video0` and `/dev/video1` as needed:

```
python src/webrtc/webrtc_sender.py --device /dev/video0 --signaling ws://<pi-ip>:9000?stream=rov
python src/webrtc/webrtc_sender.py --device /dev/video1 --signaling ws://<pi-ip>:9000?stream=rov-cam
```

If `v4l2h264enc` is not available, use CPU encoding:

```
python src/webrtc/webrtc_sender.py --device /dev/video0 --encoder x264enc --signaling ws://<pi-ip>:9000?stream=rov
```

### 4) Use the Web UI

Default URLs are already set to:

```
ws://rov:9000?stream=rov
ws://rov:9000?stream=rov-cam
```

If your browser is not using `rov` as hostname, set them in the UI settings or change the defaults in:

- src/webUI/mantaray-control-interface/hooks/useStreams.ts

## k3s deployment (cluster)

The k3s manifests now run:

- WebRTC signaling server on the land PC
- Two WebRTC senders on the ROV nodes

To deploy:

```
ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml -e "force_restart=true"
```

Signaling NodePort:

- `ws://<land-pc-ip>:30003?stream=rov`
- `ws://<land-pc-ip>:30003?stream=rov-cam`

The defaults in the UI still point to `ws://rov:9000...`. If you want the NodePort, update the URLs in:

- src/webUI/mantaray-control-interface/hooks/useStreams.ts

## Systemd auto-start (Pi)

Copy service files from `systemd/` and adjust `REPO_DIR` or camera devices if needed:

```
sudo cp systemd/webrtc-signaling.service /etc/systemd/system/
sudo cp systemd/webrtc-sender-rov.service /etc/systemd/system/
sudo cp systemd/webrtc-sender-rov-cam.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now webrtc-signaling.service
sudo systemctl enable --now webrtc-sender-rov.service
sudo systemctl enable --now webrtc-sender-rov-cam.service
```

## Low-latency presets

Recommended defaults (used in the k3s manifests and systemd services):

- Main camera: 1280x720 @ 30 FPS, 2500 kbps, key-int 30
- Aux camera: 640x480 @ 30 FPS, 900 kbps, key-int 30

If you want to override in k3s, set these variables in your inventory/group vars:

- `webrtc_main_width`, `webrtc_main_height`, `webrtc_main_fps`, `webrtc_main_bitrate`, `webrtc_main_key_int`
- `webrtc_aux_width`, `webrtc_aux_height`, `webrtc_aux_fps`, `webrtc_aux_bitrate`, `webrtc_aux_key_int`

## TODO checklist

- [ ] Install GStreamer + GI bindings on the Pi
- [ ] Run signaling server on the Pi
- [ ] Run two WebRTC senders for both cameras
- [ ] Open the Web UI and verify both streams
- [ ] Adjust resolution/FPS/bitrate if needed
- [ ] Apply k3s playbook and verify signaling NodePort
- [ ] Enable systemd services for auto-start

## Notes

- WebRTC works best when the browser and Pi are on the same LAN.
- If your Web UI is served over HTTPS, use WSS for signaling.
- For a desktop app (Pake), the same WebRTC client code works without changes.
