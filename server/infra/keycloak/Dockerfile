# Build from the repository root:
# docker build -f server/infra/keycloak/Dockerfile -t travelnest-keycloak:26.0 .
FROM quay.io/keycloak/keycloak:26.0
COPY --chown=keycloak:keycloak server/infra/keycloak/themes/ /opt/keycloak/themes/
