#!/usr/bin/env bash
#
# Publish host :80 -> k3d load balancer.
#
# k3d only maps the load balancer's :80 to the host's :8080 by default, but the
# manifests, the Keycloak realm and the SPA all use port-less URLs
# (http://travelnest.local, http://keycloak.travelnest.local, ...). Binding
# host :80 keeps those values identical to prod instead of sprinkling :8080
# everywhere.
#
# This is a plain L4 passthrough on the k3d docker network, so Traefik still
# routes by Host header. It runs as a restart-on-boot docker container and does
# not require root on the host (docker publishes the privileged port).
#
# After running this, add the hostnames to /etc/hosts (needs sudo):
#   127.0.0.1 travelnest.local api.travelnest.local \
#             keycloak.travelnest.local storage.travelnest.local admin.travelnest.local
#
# Requirements: docker on PATH, k3d cluster already running.
set -euo pipefail

CLUSTER="${K3D_CLUSTER:-travelnest}"
NETWORK="k3d-${CLUSTER}"
CONTAINER="travelnest-edge-80"
TARGET="k3d-${CLUSTER}-serverlb"

command -v docker >/dev/null 2>&1 || { echo "ERROR: 'docker' not found on PATH." >&2; exit 1; }

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "ERROR: docker network '$NETWORK' not found. Is the k3d cluster '$CLUSTER' running?" >&2
  exit 1
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  -p 80:80 \
  alpine/socat \
  "tcp-listen:80,fork,reuseaddr" "tcp-connect:${TARGET}:80"

echo "Started '$CONTAINER': host :80 -> ${TARGET}:80"
echo
echo "Verify (no DNS change needed):"
echo "  curl -s -o /dev/null -w '%{http_code}\\n' -H 'Host: travelnest.local' http://localhost/"
echo
echo "Then add the local hostnames to /etc/hosts:"
echo "  sudo tee -a /etc/hosts >/dev/null <<'EOF'"
echo "127.0.0.1 travelnest.local api.travelnest.local keycloak.travelnest.local storage.travelnest.local admin.travelnest.local"
echo "EOF"
