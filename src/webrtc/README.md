# WebRTC Streaming (GStreamer)

This folder provides a minimal WebRTC sender and a signaling server.

## Signaling server

Run on the Pi or any reachable host:

```
python src/webrtc/signaling_server.py
```

The server listens on `ws://0.0.0.0:9000` and uses the `stream` query param to separate rooms.

## Sender

Example for two USB cameras on the Pi:

```
python src/webrtc/webrtc_sender.py --device /dev/video0 --signaling ws://<pi-ip>:9000?stream=rov
python src/webrtc/webrtc_sender.py --device /dev/video1 --signaling ws://<pi-ip>:9000?stream=rov-cam
```

Default encoder is `v4l2h264enc`. If that is not available, try:

```
python src/webrtc/webrtc_sender.py --device /dev/video0 --encoder x264enc --signaling ws://<pi-ip>:9000?stream=rov
```

## Browser UI

Set the stream URLs to match the signaling endpoints, for example:

```
ws://<pi-ip>:9000?stream=rov
ws://<pi-ip>:9000?stream=rov-cam
```
