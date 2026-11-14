#!/usr/bin/env bash
#
# Mint a Keycloak access token for the TravelNest load-test client.
#
# The SPA client (`travelnest-web`) authenticates with authorization-code + PKCE,
# which cannot be scripted. `travelnest-loadtest` is a separate public client
# with direct access grants enabled, declared in the realm JSON and applied by
# the `keycloak-realm-reconcile` PostSync job. See ../README.md.
#
# Usage:
#   export LOADTEST_USERNAME=loadtest@trestay.com
#   read -rs LOADTEST_PASSWORD && export LOADTEST_PASSWORD
#   ./get-token.sh                 # prints the access token
#   ./get-token.sh --verify        # prints sub/email/email_verified instead
#
#   AUTH_TOKEN="$(./get-token.sh)" ALLOW_WRITES=true make load-test-booking
#
# Environment:
#   KEYCLOAK_URL        default https://keycloak.trestay.com
#   KEYCLOAK_REALM      default travelnest
#   CLIENT_ID           default travelnest-loadtest
#   LOADTEST_USERNAME   prompted if unset
#   LOADTEST_PASSWORD   prompted (no echo) if unset — never pass it as an arg

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-https://keycloak.trestay.com}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-travelnest}"
CLIENT_ID="${CLIENT_ID:-travelnest-loadtest}"
LOADTEST_USERNAME="${LOADTEST_USERNAME:-}"

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
}

MODE="token"
case "${1:-}" in
  "") ;;
  --verify) MODE="verify" ;;
  -h | --help) usage; exit 0 ;;
  *)
    printf 'unknown argument: %s\n\n' "$1" >&2
    usage >&2
    exit 2
    ;;
esac

if [[ -z "${LOADTEST_USERNAME}" ]]; then
  read -r -p "Load-test username: " LOADTEST_USERNAME
fi

if [[ -z "${LOADTEST_PASSWORD:-}" ]]; then
  read -r -s -p "Password for ${LOADTEST_USERNAME}: " LOADTEST_PASSWORD
  printf '\n' >&2
fi

TOKEN_ENDPOINT="${KEYCLOAK_URL%/}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token"

response="$(
  curl --silent --show-error --request POST "${TOKEN_ENDPOINT}" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "username=${LOADTEST_USERNAME}" \
    --data-urlencode "password=${LOADTEST_PASSWORD}"
)"

token="$(printf '%s' "${response}" | jq -r '.access_token // empty' 2>/dev/null || true)"

if [[ -z "${token}" ]]; then
  reason="$(printf '%s' "${response}" | jq -r '.error_description // .error // empty' 2>/dev/null || true)"
  printf 'token request failed: %s\n' "${reason:-unexpected response from ${TOKEN_ENDPOINT}}" >&2
  printf 'hints: invalid_grant = wrong password or the account is brute-force locked;\n' >&2
  printf '       unauthorized_client = direct access grants are disabled on %s;\n' "${CLIENT_ID}" >&2
  printf '       invalid_client = the client does not exist in realm %s.\n' "${KEYCLOAK_REALM}" >&2
  exit 1
fi

if [[ "${MODE}" == "verify" ]]; then
  # Decode the access token itself rather than calling /userinfo: these are the
  # exact claims the API validates (email + email_verified arrive via the
  # `travelnest-claims` client scope). /userinfo needs the `openid` scope, which
  # this client deliberately does not request.
  payload="$(printf '%s' "${token}" | cut -d. -f2 | tr '_-' '/+')"
  case $((${#payload} % 4)) in
    2) payload="${payload}==" ;;
    3) payload="${payload}=" ;;
  esac

  printf '%s' "${payload}" | base64 -d 2>/dev/null |
    jq -c '{sub, preferred_username, email, email_verified, aud, azp}'
  exit 0
fi

printf '%s\n' "${token}"
