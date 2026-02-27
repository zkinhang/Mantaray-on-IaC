# Mantaray Control Interface

Browser-based control panel for the Mantaray ROV system.
Developed by [@Louis1125](https://github.com/Louis1125).

## Quick Start

```bash
npm install
npm run dev        # development server → http://localhost:5173
npm run build      # production build  → dist/
npm run preview    # preview production build locally
```

## Prerequisites

- **Node.js ≥ 18**
- Running **ROS 2** with [`rosbridge_server`](https://github.com/RobotWebTools/rosbridge_suite) on port `9090`
- Camera HTTP streams reachable from the browser (default URLs below)

## Features

| Page | Key Functionality |
|------|-------------------|
| **Landing** | Module selector |
| **Dashboard** | Dual camera streams, terminal logs, movement controls, PID toggle |
| **Telemetry** | Sensor diagnostics |
| **Settings** | ROS bridge host, recent hosts list |

## Default ROS Topics

| Topic | Type | Purpose |
|-------|------|---------|
| `/cmd_vel` | `geometry_msgs/Twist` | ROV movement |
| `/pid/toggle` | `std_msgs/Bool` | Enable / disable PID controller |

## Default Camera Stream URLs

| Stream | Default URL |
|--------|-------------|
| ROV Camera | `http://rov:30001/stream` |
| ROV-CAM Camera | `http://rov-cam:30002/stream` |

URLs can be edited live from the Dashboard.

## Configuration

The ROS bridge host is stored in `localStorage` under `ros_target_host`.
It defaults to `localhost` (or the page's own hostname when served from the robot).
Change it from the **System Configuration** page in the UI.

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19 | UI framework |
| `react-dom` | ^19 | DOM rendering |
| `lucide-react` | ^0.562 | Icons |
| `vite` | ^6 | Build tool |
| `typescript` | ~5.8 | Type checking |
| `tailwindcss` | ^4 | Styling |
| `roslib` | ^1 (CDN) | ROS 2 WebSocket bridge |
