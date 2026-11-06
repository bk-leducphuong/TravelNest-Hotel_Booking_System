# Keycloak 26 with the TravelNest login themes baked in.
#
# Build context is this directory (see .github/workflows/keycloak.yml):
#   docker build -f server/infra/keycloak/Dockerfile -t travelnest-keycloak:26.0 \
#     server/infra/keycloak
#
# The themes land in /opt/keycloak/themes, which Keycloak merges with its
# built-in (jar-packaged) themes on startup. A new image is required for theme
# changes — the directory is not mounted from a ConfigMap.
FROM quay.io/keycloak/keycloak:26.0
COPY --chown=keycloak:keycloak themes/ /opt/keycloak/themes/
