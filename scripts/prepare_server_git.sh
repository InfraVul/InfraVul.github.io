#!/usr/bin/env bash
set -Eeuo pipefail

# Prepare a fresh Linux server for publishing InfraVul.github.io.
# Run this script from the repository root after extracting the release package.

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[INFO] not running as root; package installation may require sudo"
  SUDO="sudo"
else
  SUDO=""
fi

install_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y git openssh-client ca-certificates python3 unzip
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y git openssh-clients ca-certificates python3 unzip
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y git openssh-clients ca-certificates python3 unzip
  else
    echo "[FATAL] unsupported package manager. Install git, OpenSSH client, Python 3 and unzip manually." >&2
    exit 2
  fi
}

for cmd in git ssh ssh-keygen python3; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    install_packages
    break
  fi
done

echo "[STEP] privacy guard"
python3 scripts/check_public_repo.py .

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [[ ! -f "$HOME/.ssh/id_ed25519" ]]; then
  echo "[STEP] generating GitHub SSH key"
  ssh-keygen -t ed25519 -C "InfraVul GitHub Pages" -f "$HOME/.ssh/id_ed25519" -N ""
else
  echo "[OK] existing SSH key: $HOME/.ssh/id_ed25519"
fi

chmod 600 "$HOME/.ssh/id_ed25519"
chmod 644 "$HOME/.ssh/id_ed25519.pub"

ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
chmod 600 "$HOME/.ssh/known_hosts" 2>/dev/null || true

echo
echo "============================================================"
echo "COPY THE FOLLOWING PUBLIC KEY INTO GITHUB:"
echo "GitHub -> Settings -> SSH and GPG keys -> New SSH key"
echo "============================================================"
cat "$HOME/.ssh/id_ed25519.pub"
echo "============================================================"
echo

echo "After adding the key to GitHub, run:"
echo "  ssh -T git@github.com || true"
echo "Then run scripts/publish_to_github.sh"
