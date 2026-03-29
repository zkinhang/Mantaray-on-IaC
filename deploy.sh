#!/bin/bash
# Automated deployment script for Mantaray-on-IaC (WebRTC branch)
# Usage: bash deploy.sh [mode]
#
# Modes:
#   full        - Full cluster installation + app deployment + dashboard (default)
#   network     - Reconfigure cluster networking + redeploy apps + dashboard
#   apps        - Deploy / restart all application pods (including WebRTC)
#   dashboard   - Deploy Kubernetes dashboard only
#   verify      - Verify cluster and WebRTC pod status

set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
die()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── Prerequisites ─────────────────────────────────────────────────────────────

check_prereqs() {
    command -v ansible-playbook >/dev/null 2>&1 \
        || die "ansible-playbook not found. Install Ansible before running this script."
    command -v kubectl >/dev/null 2>&1 \
        || warn "kubectl not found – verification steps will be skipped."
}

# Change to the repository root so relative paths in playbooks work correctly.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Deployment steps ──────────────────────────────────────────────────────────

run_infra() {
    step "1/4  Running infrastructure playbook (air-gapped K3s install)…"
    ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-infra-airgap.yaml
}

fix_kube_permissions() {
    step "     Fixing kubectl permissions…"
    bash kube_permission.sh
}

run_network_switch() {
    step "1/4  Running network-switch playbook…"
    ansible-playbook -i ansible/inventory_infra.ini ansible/playbook-network-switch.yaml
}

run_apps() {
    local extra="${1:-}"
    step "2/4  Deploying all application pods (WebRTC signaling + senders + ROS nodes)…"
    ansible-playbook -i ansible/inventory.ini ansible/playbook-app.yaml \
        -e "force_restart=true" ${extra}
}

run_dashboard() {
    step "3/4  Deploying Kubernetes dashboard…"
    ansible-playbook -i ansible/inventory.ini ansible/playbook-dashboard-setup.yaml
}

verify_cluster() {
    if ! command -v kubectl >/dev/null 2>&1; then
        warn "kubectl not found – skipping cluster verification."
        return
    fi

    step "4/4  Verifying cluster status…"
    echo ""
    echo "── Nodes ──────────────────────────────────────────────────────"
    kubectl get nodes
    echo ""
    echo "── All Pods ───────────────────────────────────────────────────"
    kubectl get pods -A
    echo ""
    echo "── WebRTC Pods ────────────────────────────────────────────────"
    kubectl get pods -o wide | grep -E "webrtc|NAME" || \
        warn "No WebRTC pods found yet – they may still be starting up."
    echo ""
    step "Done. To stream, connect your browser to:"
    echo "  Main camera  →  ws://<rov-main-ip>:30003?stream=main-cam"
    echo "  Aux camera   →  ws://<rov-main-ip>:30003?stream=aux-cam"
}

# ── Modes ─────────────────────────────────────────────────────────────────────

mode="${1:-full}"

check_prereqs

case "$mode" in
    full)
        step "=== Full installation ==="
        run_infra
        fix_kube_permissions
        run_apps
        run_dashboard
        verify_cluster
        ;;
    network)
        step "=== Network switch ==="
        run_network_switch
        fix_kube_permissions
        run_apps
        run_dashboard
        verify_cluster
        ;;
    apps)
        step "=== Deploy / restart all apps ==="
        run_apps
        verify_cluster
        ;;
    dashboard)
        step "=== Dashboard deployment ==="
        run_dashboard
        ;;
    verify)
        verify_cluster
        ;;
    *)
        die "Unknown mode '${mode}'. Valid modes: full | network | apps | dashboard | verify"
        ;;
esac

step "Deployment complete (mode: ${mode})."
