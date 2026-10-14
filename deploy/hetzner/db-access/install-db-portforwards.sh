#!/usr/bin/env bash
#
# Install the host-side port-forward units that expose the in-cluster databases
# on loopback, where the Cloudflare Tunnel (cloudflared) can reach them.
#
# Topology:
#   cloudflared  --tcp-->  127.0.0.1:<LOCAL_PORT>  <--kubectl port-forward--  svc/<SERVICE>:<REMOTE_PORT>
#
# The databases stay ClusterIP-only; no port is opened on the host's public
# interface. Run this ON THE VPS HOST:
#
#   sudo deploy/hetzner/db-access/install-db-portforwards.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SRC_DIR="$ROOT/deploy/hetzner/db-access"
UNIT_SRC="$SRC_DIR/travelnest-portforward@.service"
UNIT_DST="/etc/systemd/system/travelnest-portforward@.service"
ENV_DST_DIR="/etc/travelnest/portforwards"
KUBECTL="$(command -v kubectl || true)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: run as root (sudo)." >&2
  exit 1
fi

if [[ -z "$KUBECTL" ]]; then
  echo "ERROR: kubectl not found on PATH." >&2
  exit 1
fi

echo "==> Installing port-forward unit"
install -m 0644 "$UNIT_SRC" "$UNIT_DST"

echo "==> Installing instance env files into $ENV_DST_DIR"
install -d -m 0755 "$ENV_DST_DIR"
for env_file in "$SRC_DIR"/ports/*.env; do
  install -m 0644 "$env_file" "$ENV_DST_DIR/$(basename "$env_file")"
done

systemctl daemon-reload

echo "==> Enabling + starting instances"
for env_file in "$SRC_DIR"/ports/*.env; do
  instance="$(basename "$env_file" .env)"
  systemctl enable --now "travelnest-portforward@${instance}.service"
done

echo
echo "==> Status"
for env_file in "$SRC_DIR"/ports/*.env; do
  instance="$(basename "$env_file" .env)"
  systemctl --no-pager --lines=0 status "travelnest-portforward@${instance}.service" || true
done

echo
echo "Done. Verify with: ss -ltnp | grep -E '13306|16379|27017'"
