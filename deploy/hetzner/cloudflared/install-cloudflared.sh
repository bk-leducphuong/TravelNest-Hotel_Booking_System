#!/usr/bin/env bash
#
# Install and configure the locally-managed Cloudflare Tunnel on the TravelNest
# VPS host. Idempotent: safe to re-run.
#
# Prereqs:
#   - Ubuntu 24.04 (arm64), root/sudo
#   - `cf` CLI authenticated locally (used once to fetch the tunnel token)
#   - k3s installed, so Traefik is published on host :80 (apps are 502 until then)
#
# Usage:
#   sudo ./install-cloudflared.sh
#
set -euo pipefail

TUNNEL_ID="${TUNNEL_ID:-f3cf83fa-a17c-4e1e-ae43-8c2774b0def8}"
ACCOUNT_ID="${ACCOUNT_ID:-938ceca1e7de73dcb1f962d4c48a462e}"
CFGDIR=/etc/cloudflared
CREDS="${CFGDIR}/${TUNNEL_ID}.json"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

log "Installing cloudflared (arm64)..."
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb >/dev/null 2>&1 || apt-get -fy install >/dev/null
else
  echo "    already installed: $(cloudflared --version)"
fi

log "Writing credentials file ${CREDS}..."
install -d -m 700 "$CFGDIR"
if [[ -s "$CREDS" ]]; then
  echo "    already present, leaving as-is"
else
  # Derive the locally-managed credentials JSON from the tunnel token.
  # Token is base64url(JSON {a:account, t:tunnel, s:secret}).
  command -v cf >/dev/null 2>&1 || { echo "cf CLI not found; cannot fetch token" >&2; exit 1; }
  TOKEN="$(cf tunnels token get "$TUNNEL_ID")"
  python3 - "$TOKEN" "$TUNNEL_ID" "$ACCOUNT_ID" > "$CREDS" <<'PY'
import sys, base64, json
raw, tunnel_id, account_id = sys.argv[1].strip(), sys.argv[2], sys.argv[3]
try:
    j = json.loads(raw)
    if isinstance(j, dict):
        raw = j.get("token") or j.get("result") or raw
except Exception:
    pass
d = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
assert d.get("t") == tunnel_id, "tunnel id mismatch"
assert d.get("a") == account_id, "account mismatch"
print(json.dumps({"AccountTag": d["a"], "TunnelID": d["t"], "TunnelSecret": d["s"]}))
PY
  chmod 600 "$CREDS"
fi

log "Writing /etc/cloudflared/config.yml and systemd unit..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 644 "${SCRIPT_DIR}/config.yml" "${CFGDIR}/config.yml"
install -m 644 "${SCRIPT_DIR}/cloudflared.service" /etc/systemd/system/cloudflared.service

log "Starting service..."
systemctl daemon-reload
systemctl enable --now cloudflared
sleep 4
systemctl --no-pager --full status cloudflared | sed -n '1,8p' || true

log "Done. Validate: cloudflared tunnel --config ${CFGDIR}/config.yml ingress validate"
