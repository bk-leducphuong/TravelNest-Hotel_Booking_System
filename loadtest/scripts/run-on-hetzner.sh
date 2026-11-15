#!/usr/bin/env bash
#
# Run the k6 suites from an ephemeral Hetzner Cloud server and delete it
# afterwards (even on Ctrl-C). The server is created in the target's region so
# the generator is never the bottleneck and shares no CPU with the API.
#
# Usage:
#   ./run-on-hetzner.sh                     # read path, 12 peak VUs, ~10m30s
#   ./run-on-hetzner.sh --vus 25            # push harder
#   ./run-on-hetzner.sh --funnel --duration 5m
#   ./run-on-hetzner.sh --keep              # leave the VM running
#
# Options:
#   --vus N          peak VUs for the read path (default 12)
#   --funnel         run the booking funnel instead of the read path
#   --duration D     funnel duration (default 5m)
#   --city NAME      search city (default Hanoi)
#   --base-url URL   target (default https://api.trestay.com)
#   --keep           do not delete the server (prints how to delete it)
#   --type TYPE      server type (default cx23)
#   --location LOC   Hetzner location (default hel1)
#   --name NAME      server name (default tn-loadgen-<timestamp>)
#   --skip-preflight skip the throttle check before the run
#
# Environment:
#   BYPASS_TOKEN       rate-limiter exemption, sent as X-Load-Test-Token.
#                      Required unless RATE_LIMIT_ENABLED=false on the target:
#                      a ramp issues thousands of requests and the limiter
#                      allows 300 per 15 min per client.
#   LOADTEST_USERNAME  funnel only (default loadtest@trestay.com)
#   LOADTEST_PASSWORD  funnel only
#   KEYCLOAK_URL       funnel only (default https://keycloak.trestay.com)
#   SSH_KEY            private key (default ~/.ssh/id_ed25519_hetzner)
#   HCLOUD_SSH_KEY     Hetzner key name (default: the project's only key)
#
# Costs: a cx23 is ~EUR 0.0104/h, billed per started hour, so a run costs about
# one cent. Deletion is the only thing that stops billing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOADTEST_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${LOADTEST_DIR}/.." && pwd)"

K6_IMAGE="${K6_IMAGE:-grafana/k6:2.4.0}"
SERVER_TYPE="${SERVER_TYPE:-cx23}"
LOCATION="${LOCATION:-hel1}"
BASE_URL="${BASE_URL:-https://api.trestay.com}"
CITY="${CITY:-Hanoi}"
PEAK_VUS="${PEAK_VUS:-12}"
DURATION="${DURATION:-5m}"
SERVER_NAME=""
KEEP="${KEEP:-false}"
MODE="read"
SKIP_PREFLIGHT="${SKIP_PREFLIGHT:-false}"

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SSH_OPTS=(-o "StrictHostKeyChecking=accept-new" -o "ConnectTimeout=5")

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vus) PEAK_VUS="$2"; shift 2 ;;
    --funnel) MODE="funnel"; shift ;;
    --duration) DURATION="$2"; shift 2 ;;
    --city) CITY="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --keep) KEEP="true"; shift ;;
    --type) SERVER_TYPE="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --name) SERVER_NAME="$2"; shift 2 ;;
    --skip-preflight) SKIP_PREFLIGHT="true"; shift ;;
    -h | --help) usage; exit 0 ;;
    *) printf 'unknown option: %s\n\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

BASE_URL="${BASE_URL%/}"
SERVER_NAME="${SERVER_NAME:-tn-loadgen-$(date +%s)}"

if [[ "${MODE}" == "funnel" && -z "${LOADTEST_PASSWORD:-}" ]]; then
  printf 'funnel mode needs LOADTEST_PASSWORD (see loadtest/README.md)\n' >&2
  exit 2
fi

if [[ -z "${BYPASS_TOKEN:-}" && "${SKIP_PREFLIGHT}" != "true" ]]; then
  printf 'warning: BYPASS_TOKEN is not set — the run will be throttled at 300\n' >&2
  printf '         requests unless the target has RATE_LIMIT_ENABLED=false.\n' >&2
fi

command -v hcloud >/dev/null || { printf 'hcloud CLI not found\n' >&2; exit 1; }
command -v rsync >/dev/null || { printf 'rsync not found\n' >&2; exit 1; }
[[ -f "${SSH_KEY}" ]] || { printf 'SSH key not found: %s\n' "${SSH_KEY}" >&2; exit 1; }

HCLOUD_SSH_KEY="${HCLOUD_SSH_KEY:-$(hcloud ssh-key list -o noheader -o columns=name | head -1)}"
[[ -n "${HCLOUD_SSH_KEY}" ]] || { printf 'no Hetzner SSH key in this project\n' >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
USER_DATA="${TMP_DIR}/cloud-init.yaml"
ENV_FILE="${TMP_DIR}/k6.env"
KNOWN_HOSTS="${TMP_DIR}/known_hosts"
IP=""
CREATED="false"

cleanup() {
  local status=$?
  set +e
  if [[ "${CREATED}" == "true" && "${KEEP}" != "true" ]]; then
    printf '\ndeleting %s...\n' "${SERVER_NAME}"
    hcloud server delete "${SERVER_NAME}" >/dev/null && printf 'deleted\n'
  elif [[ "${CREATED}" == "true" ]]; then
    printf '\nkept %s (%s) — delete it with: hcloud server delete %s\n' \
      "${SERVER_NAME}" "${IP}" "${SERVER_NAME}"
  fi
  rm -rf "${TMP_DIR}"
  exit "${status}"
}
trap cleanup EXIT INT TERM

sed "s|__K6_IMAGE__|${K6_IMAGE}|" "${LOADTEST_DIR}/cloud-init.yaml" >"${USER_DATA}"

printf 'creating %s (%s, %s) in %s...\n' "${SERVER_NAME}" "${SERVER_TYPE}" "${K6_IMAGE}" "${LOCATION}"
hcloud server create \
  --name "${SERVER_NAME}" \
  --type "${SERVER_TYPE}" \
  --image ubuntu-24.04 \
  --location "${LOCATION}" \
  --ssh-key "${HCLOUD_SSH_KEY}" \
  --user-data-from-file "${USER_DATA}" >/dev/null
CREATED="true"

IP="$(hcloud server list -o noheader -o columns=name,ipv4 |
  awk -v name="${SERVER_NAME}" '$1 == name { print $2; exit }')"
[[ -n "${IP}" ]] || { printf 'could not resolve the IP of %s\n' "${SERVER_NAME}" >&2; exit 1; }
printf 'server up: %s\n' "${IP}"

ssh_run() {
  ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" -o "UserKnownHostsFile=${KNOWN_HOSTS}" "root@${IP}" "$@"
}

printf 'waiting for ssh'
for _ in $(seq 1 60); do
  if ssh_run true >/dev/null 2>&1; then printf ' ok\n'; break; fi
  printf '.'
  sleep 5
done
ssh_run true >/dev/null 2>&1 || { printf '\nssh never came up\n' >&2; exit 1; }

printf 'waiting for cloud-init (docker + %s)\n' "${K6_IMAGE}"
ssh_run 'cloud-init status --wait >/dev/null 2>&1 || true; docker info >/dev/null 2>&1'

printf 'syncing suite...\n'
rsync -az --delete -e "ssh -i ${SSH_KEY} ${SSH_OPTS[*]} -o UserKnownHostsFile=${KNOWN_HOSTS}" \
  "${LOADTEST_DIR}/k6" "${LOADTEST_DIR}/scripts" "root@${IP}:/root/loadtest/"

# Secrets travel over stdin into a 0600 file, never through argv or the shell
# history of either machine, and the box is deleted at the end.
if [[ -n "${BYPASS_TOKEN:-}" ]]; then
  printf 'BYPASS_TOKEN=%s\n' "${BYPASS_TOKEN}" >"${ENV_FILE}"
fi

if [[ "${MODE}" == "funnel" ]]; then
  # Just the value: the file is read with `cat` into LOADTEST_PASSWORD.
  printf '%s' "${LOADTEST_PASSWORD}" |
    ssh_run 'umask 077 && cat > /root/.lt-pass'
  ssh_run "cd /root/loadtest && KEYCLOAK_URL='${KEYCLOAK_URL:-https://keycloak.trestay.com}' \
    LOADTEST_USERNAME='${LOADTEST_USERNAME:-loadtest@trestay.com}' \
    LOADTEST_PASSWORD=\"\$(cat /root/.lt-pass)\" ./scripts/get-token.sh --verify"
  AUTH_TOKEN="$(ssh_run "cd /root/loadtest && KEYCLOAK_URL='${KEYCLOAK_URL:-https://keycloak.trestay.com}' \
    LOADTEST_USERNAME='${LOADTEST_USERNAME:-loadtest@trestay.com}' \
    LOADTEST_PASSWORD=\"\$(cat /root/.lt-pass)\" ./scripts/get-token.sh")"
  ssh_run 'rm -f /root/.lt-pass'
  [[ -n "${AUTH_TOKEN}" ]] || { printf 'no AUTH_TOKEN from Keycloak\n' >&2; exit 1; }
  printf 'AUTH_TOKEN=%s\nALLOW_WRITES=true\n' "${AUTH_TOKEN}" >>"${ENV_FILE}"
fi

if [[ -s "${ENV_FILE}" ]]; then
  ssh_run 'umask 077 && cat > /root/.k6.env' <"${ENV_FILE}"
fi

if [[ "${SKIP_PREFLIGHT}" != "true" ]]; then
  printf 'preflight: checking the target from the generator\n'
  # The token is expanded inside the remote shell from the env file, so it
  # never appears in a process list on either machine.
  PREFLIGHT_CMD='set -a; [ -f /root/.k6.env ] && . /root/.k6.env; set +a; '
  PREFLIGHT_CMD+='curl -s -D - -o /dev/null '
  PREFLIGHT_CMD+='-H "X-Load-Test-Token: ${BYPASS_TOKEN:-}" '
  PREFLIGHT_CMD+="'${BASE_URL}/api/v1/search/destinations/trending?limit=4'"
  HEADERS="$(ssh_run "sh -c '${PREFLIGHT_CMD}'")"
  if grep -qi '^ratelimit-limit' <<<"${HEADERS}"; then
    printf '  throttled: the API returned RateLimit headers.\n' >&2
    printf '  Set RATE_LIMIT_BYPASS_TOKEN on the target and pass BYPASS_TOKEN, or run with --skip-preflight.\n' >&2
    exit 1
  fi
  printf '  exempt from the limiter\n'
fi

RUN_ID="$(date +%Y%m%d-%H%M%S)"
mkdir -p "${LOADTEST_DIR}/results"

# k6 writes its JSON summary under RESULT_DIR; the directory has to exist and be
# writable by the container user before the run, otherwise the summary is lost
# while the console output still looks fine.
ssh_run 'mkdir -p /root/loadtest/results && chmod 777 /root/loadtest/results'

if [[ "${MODE}" == "funnel" ]]; then
  printf '\nrunning booking funnel: %s for %s\n\n' "${BASE_URL}" "${DURATION}"
  ssh_run "docker run --rm --network host --user 0:0 \
    --env-file /root/.k6.env \
    -e BASE_URL='${BASE_URL}' -e CITY='${CITY}' -e DURATION='${DURATION}' \
    -e RESULT_DIR=/lt/results \
    -v /root/loadtest:/lt ${K6_IMAGE} run /lt/k6/booking-funnel.js"
else
  printf '\nrunning read path: %s, peak %s VUs\n\n' "${BASE_URL}" "${PEAK_VUS}"
  ssh_run "docker run --rm --network host --user 0:0 \
    --env-file /root/.k6.env \
    -e BASE_URL='${BASE_URL}' -e CITY='${CITY}' -e PEAK_VUS='${PEAK_VUS}' \
    -e RESULT_DIR=/lt/results \
    -v /root/loadtest:/lt ${K6_IMAGE} run /lt/k6/read-path.js"
fi

printf 'collecting results...\n'
if rsync -az -e "ssh -i ${SSH_KEY} ${SSH_OPTS[*]} -o UserKnownHostsFile=${KNOWN_HOSTS}" \
  "root@${IP}:/root/loadtest/results/" "${LOADTEST_DIR}/results/${RUN_ID}/"; then
  printf 'results saved to loadtest/results/%s/\n' "${RUN_ID}"
else
  printf 'no k6 JSON summary was retrieved (the console summary above is still valid)\n' >&2
fi
