#!/bin/bash
# Install and enable WebRTC systemd services on the Pi
# Usage: sudo bash install-webrtc-services.sh <repo-dir>

set -e

if [ -z "$1" ]; then
    echo "Usage: sudo bash $0 <repo-dir>"
    echo "Example: sudo bash $0 /opt/mantaray/Mantaray-on-IaC"
    exit 1
fi

REPO_DIR="$1"

if [ ! -d "$REPO_DIR" ]; then
    echo "Error: Directory $REPO_DIR does not exist"
    exit 1
fi

echo "Installing WebRTC systemd services from $REPO_DIR..."

# Copy service files
echo "[1/5] Copying signaling service..."
sed "s|REPO_DIR=.*|REPO_DIR=$REPO_DIR|" "$REPO_DIR/systemd/webrtc-signaling.service" | tee /etc/systemd/system/webrtc-signaling.service > /dev/null

echo "[2/5] Copying sender-rov service..."
sed "s|REPO_DIR=.*|REPO_DIR=$REPO_DIR|" "$REPO_DIR/systemd/webrtc-sender-rov.service" | tee /etc/systemd/system/webrtc-sender-rov.service > /dev/null

echo "[3/5] Copying sender-rov-cam service..."
sed "s|REPO_DIR=.*|REPO_DIR=$REPO_DIR|" "$REPO_DIR/systemd/webrtc-sender-rov-cam.service" | tee /etc/systemd/system/webrtc-sender-rov-cam.service > /dev/null

echo "[4/5] Reloading systemd daemon..."
systemctl daemon-reload

echo "[5/5] Enabling services..."
systemctl enable webrtc-signaling.service
systemctl enable webrtc-sender-rov.service
systemctl enable webrtc-sender-rov-cam.service

echo ""
echo "Installation complete. Services are configured to start at boot."
echo ""
echo "To start services now:"
echo "  sudo systemctl start webrtc-signaling.service"
echo "  sudo systemctl start webrtc-sender-rov.service"
echo "  sudo systemctl start webrtc-sender-rov-cam.service"
echo ""
echo "To check status:"
echo "  sudo systemctl status webrtc-signaling.service"
echo "  sudo systemctl status webrtc-sender-rov.service"
echo "  sudo systemctl status webrtc-sender-rov-cam.service"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u webrtc-signaling.service -f"
echo "  sudo journalctl -u webrtc-sender-rov.service -f"
echo "  sudo journalctl -u webrtc-sender-rov-cam.service -f"
