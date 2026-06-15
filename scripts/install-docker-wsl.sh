#!/usr/bin/env bash
#
# install-docker-wsl.sh
# ---------------------
# Installs Docker Engine + Compose plugin NATIVELY inside Ubuntu (WSL 2),
# so the project no longer depends on Docker Desktop on Windows.
#
# Run once:   bash scripts/install-docker-wsl.sh
# (it will ask for your sudo password)
#
# After it finishes you MUST restart WSL so your user joins the 'docker'
# group:  in Windows PowerShell ->  wsl --shutdown   (then reopen Ubuntu)
#
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${CYAN}>> $1${NC}"; }
ok()   { echo -e "${GREEN}   $1${NC}"; }
warn() { echo -e "${YELLOW}   $1${NC}"; }

# Self-elevate: re-run under sudo if not root
if [ "$(id -u)" -ne 0 ]; then
  step "Requesting sudo (you will be prompted for your password)..."
  exec sudo -E bash "$0" "${SUDO_TARGET_USER:-$USER}"
fi

# When re-executed under sudo, $1 is the real (non-root) username to add to docker group
TARGET_USER="${1:-${SUDO_USER:-$USER}}"

if command -v docker >/dev/null 2>&1 && docker --version 2>/dev/null | grep -qi "docker"; then
  if [ -S /var/run/docker.sock ] || systemctl is-active --quiet docker 2>/dev/null; then
    ok "Docker Engine already installed: $(docker --version)"
    warn "Re-running setup to ensure group + service are configured."
  fi
fi

# ── 1. Prereqs ────────────────────────────────────────────────────────────────
step "Installing prerequisites (ca-certificates, curl)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl
ok "Prereqs installed."

# ── 2. Docker apt repository ──────────────────────────────────────────────────
step "Adding Docker's official apt repository..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
ok "Repository added (${ARCH}/${CODENAME})."

# ── 3. Install Docker Engine + Compose plugin ─────────────────────────────────
step "Installing Docker Engine, CLI, containerd, buildx & compose plugin..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
ok "Docker packages installed: $(docker --version)"

# ── 4. Enable the daemon via systemd (WSL has systemd=true) ───────────────────
step "Enabling & starting the Docker service..."
systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker  || warn "Could not start docker via systemd; a WSL restart will start it."
ok "Docker service enabled."

# ── 5. Add the real user to the docker group (rootless CLI access) ─────────────
step "Adding user '${TARGET_USER}' to the 'docker' group..."
groupadd -f docker
usermod -aG docker "${TARGET_USER}"
ok "User added to 'docker' group."

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Docker Engine installed inside WSL.${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${YELLOW}REQUIRED NEXT STEP — restart WSL so group membership applies:${NC}"
echo "   1. Open Windows PowerShell"
echo "   2. Run:   wsl --shutdown"
echo "   3. Reopen your Ubuntu terminal"
echo ""
echo -e "Then verify (no sudo needed):  ${CYAN}docker run --rm hello-world${NC}"
echo -e "And launch the project:        ${CYAN}npm run dev:full${NC}"
echo ""
echo -e "${YELLOW}Optional — stop using Docker Desktop:${NC}"
echo "   Docker Desktop > Settings > Resources > WSL Integration >"
echo "   turn OFF integration for this distro (so the native engine is used)."
