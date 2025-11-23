# Sample workflow to setup k3s in air-gapped environment
# Install k3s in air-gapped environemnt by manually deploying images

# Make the files executable
chmod +x k3s-setup/install.sh
chmod +x k3s-setup/files/k3s-arm64
chmod +x k3s-setup/files/k3s-amd64

# Copy binary to the agent nodes
scp k3s-setup/files/k3s-arm64 EEC@rov.local:/tmp/k3s/k3s-arm64
scp k3s-setup/files/k3s-amd64 EEC@rov-cam.local:/tmp/k3s/k3s-amd64

# Copy images to the agent nodes
scp k3s-setup/files/k3s-airgap-images-arm64.tar.zst EEC@rov.local:/tmp/k3s/k3s-airgap-images-arm64.tar.zst
scp k3s-setup/files/k3s-airgap-images-amd64.tar.zst EEC@rov-cam.local:/tmp/k3s/k3s-airgap-images-amd64.tar.zst

# Copy installation script to the agent nodes
scp k3s-setup/install.sh EEC@rov.local:/tmp/k3s/install.sh
scp k3s-setup/install.sh EEC@rov-cam.local:/tmp/k3s/install.sh

# Move the files into place with sudo
sudo mv k3s-setup/files/k3s /usr/local/bin/k3s && chmod +x /usr/local/bin/k3s

ssh EEC@rov.local 'sudo mkdir -p /var/lib/rancher/k3s/agent/images; \
                   sudo mv /tmp/k3s/k3s-arm64 /usr/local/bin/k3s && sudo chmod +x /usr/local/bin/k3s; \
                   sudo mv /tmp/k3s/k3s-airgap-images-arm64.tar.zst /var/lib/rancher/k3s/agent/images/k3s-airgap-images-arm64.tar.zst; \
                   sudo chmod +x /tmp/k3s/install.sh'
ssh EEC@rov-cam.local 'sudo mkdir -p /var/lib/rancher/k3s/agent/images; \
                       sudo mv /tmp/k3s/k3s-amd64 /usr/local/bin/k3s && sudo chmod +x /usr/local/bin/k3s; \
                       sudo mv /tmp/k3s/k3s-airgap-images-amd64.tar.zst /var/lib/rancher/k3s/agent/images/k3s-airgap-images-amd64.tar.zst; \
                       sudo chmod +x /tmp/k3s/install.sh'

# Install k3s server on the main node
INSTALL_K3S_SKIP_DOWNLOAD=true k3s-setup/install.sh

sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER":"$USER" ~/.kube/config

# Assume now got the ip and token, install k3s agents on the agent nodes
ssh EEC@rov.local 'INSTALL_K3S_SKIP_DOWNLOAD=true K3S_URL=https://192.168.10.130:6443 K3S_TOKEN="K10cb1b9432cf1acbcc37507b52e9f7f22799965314882f0f4365302ce6cbe17c2f::server:7802fc1171c0a7bbcb82c5d3f294a32a" /tmp/k3s/install.sh'
ssh EEC@rov-cam.local 'INSTALL_K3S_SKIP_DOWNLOAD=true K3S_URL=https://192.168.10.130:6443 K3S_TOKEN="K10cb1b9432cf1acbcc37507b52e9f7f22799965314882f0f4365302ce6cbe17c2f::server:7802fc1171c0a7bbcb82c5d3f294a32a" /tmp/k3s/install.sh'

# Verify nodes are connected
kubectl get nodes