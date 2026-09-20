#!/usr/bin/env bash
#
# Build the frontend image with the LOCAL cluster URLs baked in and import it
# into the k3d cluster.
#
# Why this exists: Vite inlines VITE_* at build time. The CI 'develop' image
# bakes https://api.deployserver.work into the bundle, so serving it in the
# local cluster makes the SPA call PRODUCTION. The local overlay therefore
# pins docker.io/leducphuong/travelnest-frontend:local (see
# deploy/k8s/apps/frontend/overlays/local/kustomization.yaml) and this script
# produces that image.
#
# The API path is relative (/api/v1) so the browser calls the frontend's own
# origin and nginx proxies /api and /socket.io to the in-cluster api Service.
# Keycloak and MinIO are separate hostnames and must stay absolute.
#
# Requirements: docker and k3d on PATH, cluster already running.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLUSTER="${K3D_CLUSTER:-travelnest}"
IMAGE="${FRONTEND_IMAGE:-docker.io/leducphuong/travelnest-frontend:local}"

VITE_SERVER_HOST="${VITE_SERVER_HOST:-/api/v1}"
VITE_MINIO_URL="${VITE_MINIO_URL:-http://storage.travelnest.local/uploads/}"
VITE_KEYCLOAK_URL="${VITE_KEYCLOAK_URL:-http://keycloak.travelnest.local}"
VITE_KEYCLOAK_REALM="${VITE_KEYCLOAK_REALM:-travelnest}"
VITE_KEYCLOAK_CLIENT_ID="${VITE_KEYCLOAK_CLIENT_ID:-travelnest-web}"
# The build container runs `yarn` (corepack) and needs working DNS. On hosts
# using systemd-resolved (127.0.0.53) Docker's default bridge cannot resolve;
# host networking avoids that. Set DOCKER_BUILD_NETWORK=default to opt out.
DOCKER_BUILD_NETWORK="${DOCKER_BUILD_NETWORK:-host}"

for cmd in docker k3d; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERROR: '$cmd' not found on PATH." >&2; exit 1; }
done

echo "Building $IMAGE"
echo "  VITE_SERVER_HOST      = $VITE_SERVER_HOST"
echo "  VITE_MINIO_URL        = $VITE_MINIO_URL"
echo "  VITE_KEYCLOAK_URL     = $VITE_KEYCLOAK_URL"
echo "  VITE_KEYCLOAK_REALM   = $VITE_KEYCLOAK_REALM"
echo "  VITE_KEYCLOAK_CLIENT  = $VITE_KEYCLOAK_CLIENT_ID"

docker build \
  --network "$DOCKER_BUILD_NETWORK" \
  -f "$ROOT/client/Dockerfile" \
  -t "$IMAGE" \
  --build-arg "VITE_SERVER_HOST=$VITE_SERVER_HOST" \
  --build-arg "VITE_MINIO_URL=$VITE_MINIO_URL" \
  --build-arg "VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL" \
  --build-arg "VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM" \
  --build-arg "VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID" \
  "$ROOT"

k3d image import "$IMAGE" -c "$CLUSTER"

echo
echo "Imported $IMAGE into k3d cluster '$CLUSTER'."
echo "Restart the frontend so the node picks up the new image:"
echo "  kubectl -n travelnest rollout restart deployment/frontend"
