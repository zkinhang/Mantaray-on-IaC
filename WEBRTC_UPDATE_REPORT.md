# WebRTC Update Report

## Summary
WebRTC startup is now fully argument-driven for resolution and FPS.

- Added CLI arguments for stream settings in the WebRTC script.
- Updated Ansible Kubernetes deployment commands to pass explicit resolution and FPS.

## Files Changed

1. `src/webrtc_streamer/webrtc_streamer.py`
- Added:
  - `--width` at `src/webrtc_streamer/webrtc_streamer.py:156`
  - `--height` at `src/webrtc_streamer/webrtc_streamer.py:157`
  - `--fps` at `src/webrtc_streamer/webrtc_streamer.py:158`
- Wired args into camera startup:
  - `src/webrtc_streamer/webrtc_streamer.py:163`

2. `ansible/k8s/manta-ray-deployment.yaml.j2`
- Updated both streamer deployments to run with explicit arguments:
  - `ansible/k8s/manta-ray-deployment.yaml.j2:175`
  - `ansible/k8s/manta-ray-deployment.yaml.j2:206`
- Command now:
```yaml
command: ["python", "src/webrtc_streamer.py", "--width", "1280", "--height", "960", "--fps", "60"]
```

## How To Use Arguments

Run manually:
```bash
python src/webrtc_streamer.py --width 1280 --height 960 --fps 60
```

Other example:
```bash
python src/webrtc_streamer.py --width 1920 --height 1080 --fps 30
```

Available arguments:
- `--width` camera width (default `1280`)
- `--height` camera height (default `960`)
- `--fps` camera FPS (default `60`)
- `--device` camera device index/path (default `0`)
- `--port` signaling HTTP port (default `8080`)

## Current Deployment Behavior
When you run Ansible now, both WebRTC pods start with:
- resolution `1280x960`
- FPS `60`

So it is explicit and consistent across deployments.
