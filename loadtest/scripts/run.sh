#!/usr/bin/env bash
#
# One command to run a load test. Resolves the target, the rate-limiter
# exemption and (for the funnel) a guest token, then runs k6 in Docker.
#
#   ./loadtest/scripts/run.sh                  read path against prod
#   ./loadtest/scripts/run.sh --local          read path against localhost:3000
#   ./loadtest/scripts/run.sh --smoke          read path, 20s sanity check
#   ./loadtest/scripts/run.sh --funnel         booking funnel (no payment)
#   ./loadtest/scripts/run.sh --funnel --pay   funnel + Stripe test payment
#   ./loadtest/scripts/run.sh --remote         run it from an ephemeral Hetzner VM
#
# Flags:
#   --local | --prod     target (default prod, https://api.trestay.com)
#   --read | --funnel    suite (default read)
#   --pay                funnel only: confirm each booking with a Stripe test card
#   --remote             create a Hetzner VM, run there, delete it afterwards
#   --vus N              read path peak VUs (default 12)
#   --duration D         funnel duration (default 10m)
#   --city NAME          search city (default Hanoi)
#   --smoke              read path only: 2 VUs for 20s
#   --no-preflight       skip the "am I throttled?" check
#   -h, --help
#
# Configuration comes from loadtest/.env if present, then the environment, then
# deploy/k8s/.env.prod for the two secrets. See .env.example.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOADTEST_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${LOADTEST_DIR}/.." && pwd)"

K6_IMAGE="${K6_IMAGE:-grafana/k6:2.4.0}"

MODE="read"
TARGET="prod"
REMOTE="false"
PAY="false"
PREFLIGHT="true"
SMOKE="${SMOKE:-false}"
VUS="${PEAK_VUS:-}"
DURATION_ARG=""
CITY_ARG=""
BASE_URL_ARG=""

usage() { sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) TARGET="local"; shift ;;
    --prod) TARGET="prod"; shift ;;
    --read) MODE="read"; shift ;;
    --funnel) MODE="funnel"; shift ;;
    --pay) PAY="true"; shift ;;
    --remote) REMOTE="true"; shift ;;
    --vus) VUS="$2"; shift 2 ;;
    --duration) DURATION_ARG="$2"; shift 2 ;;
    --city) CITY_ARG="$2"; shift 2 ;;
    --base-url) BASE_URL_ARG="$2"; shift 2 ;;
    --smoke) SMOKE="true"; shift ;;
    --no-preflight) PREFLIGHT="false"; shift ;;
    -h | --help) usage; exit 0 ;;
    *) printf 'unknown option: %s\n\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -f "${LOADTEST_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${LOADTEST_DIR}/.env"
  set +a
fi

VUS="${VUS:-12}"
DURATION="${DURATION_ARG:-${DURATION:-10m}}"
CITY="${CITY_ARG:-${CITY:-Hanoi}}"

# Two secrets, taken from the gitignored prod env file without sourcing it (it
# holds far more than a load test should see).
PROD_ENV="${REPO_ROOT}/deploy/k8s/.env.prod"
env_value() {
  [[ -f "${PROD_ENV}" ]] || return 0
  sed -n "s/^$1=//p" "${PROD_ENV}" | head -1
}

BYPASS_TOKEN="${BYPASS_TOKEN:-$(env_value RATE_LIMIT_BYPASS_TOKEN)}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-$(env_value STRIPE_SECRET_KEY)}"
export BYPASS_TOKEN STRIPE_SECRET_KEY

if [[ "${TARGET}" == "local" ]]; then
  BASE_URL="${BASE_URL_ARG:-${BASE_URL:-http://localhost:3000}}"
else
  BASE_URL="${BASE_URL_ARG:-${BASE_URL:-https://api.trestay.com}}"
fi
BASE_URL="${BASE_URL%/}"

if [[ "${PAY}" == "true" && "${MODE}" != "funnel" ]]; then
  printf -- '--pay only applies to --funnel\n' >&2
  exit 2
fi

if [[ "${REMOTE}" == "true" && "${PAY}" == "true" ]]; then
  printf -- '--remote cannot pay: the Stripe key must stay on this machine.\n' >&2
  printf 'Run the funnel locally with --pay, or drop --pay.\n' >&2
  exit 2
fi

if [[ "${REMOTE}" == "true" ]]; then
  args=(--base-url "${BASE_URL}" --city "${CITY}")
  [[ "${MODE}" == "funnel" ]] && args+=(--funnel --duration "${DURATION}")
  [[ "${MODE}" == "funnel" ]] || args+=(--vus "${VUS}")
  [[ "${PREFLIGHT}" == "false" ]] && args+=(--skip-preflight)
  exec "${SCRIPT_DIR}/run-on-hetzner.sh" "${args[@]}"
fi

if [[ "${MODE}" == "funnel" ]]; then
  if [[ -z "${AUTH_TOKEN:-}" ]]; then
    if [[ -z "${LOADTEST_PASSWORD:-}" ]]; then
      printf 'funnel mode needs a guest: copy loadtest/.env.example to loadtest/.env\n' >&2
      printf 'and set LOADTEST_PASSWORD, or export AUTH_TOKEN yourself.\n' >&2
      exit 2
    fi
    printf 'minting a guest token for %s...\n' "${LOADTEST_USERNAME:-loadtest@trestay.com}"
    AUTH_TOKEN="$("${SCRIPT_DIR}/get-token.sh")"
    export AUTH_TOKEN
  fi
  if [[ "${PAY}" == "true" ]]; then
    [[ -n "${STRIPE_SECRET_KEY}" ]] || {
      printf -- '--pay needs STRIPE_SECRET_KEY (test mode) in loadtest/.env or deploy/k8s/.env.prod\n' >&2
      exit 2
    }
    [[ "${STRIPE_SECRET_KEY}" == sk_test_* ]] || {
      printf 'refusing --pay with a non-test Stripe key\n' >&2
      exit 2
    }
  fi
fi

if [[ "${TARGET}" == "prod" && -z "${BYPASS_TOKEN}" && "${PREFLIGHT}" == "true" ]]; then
  printf 'warning: no BYPASS_TOKEN — the run will be throttled at 300 requests.\n' >&2
fi

if [[ "${PREFLIGHT}" == "true" && "${TARGET}" == "prod" ]]; then
  headers="$(curl -s -D - -o /dev/null \
    -H "X-Load-Test-Token: ${BYPASS_TOKEN}" \
    "${BASE_URL}/api/v1/search/destinations/trending?limit=4")"
  if grep -qi '^ratelimit-limit' <<<"${headers}"; then
    printf 'target is still throttling this client; fix BYPASS_TOKEN or pass --no-preflight\n' >&2
    exit 1
  fi
fi

mkdir -p "${LOADTEST_DIR}/results"

summary="${BASE_URL}  ·  ${MODE}"
[[ "${MODE}" == "read" ]] && summary+="  ·  peak ${VUS} VUs"
[[ "${MODE}" == "funnel" ]] && summary+="  ·  ${DURATION}"
[[ "${PAY}" == "true" ]] && summary+="  ·  paying with a test card"
printf 'running: %s\n\n' "${summary}"

common_env=(-e "BASE_URL=${BASE_URL}" -e "CITY=${CITY}" -e RESULT_DIR=/lt/results -e BYPASS_TOKEN)

if [[ "${MODE}" == "funnel" ]]; then
  docker run --rm -i \
    --user "$(id -u):$(id -g)" \
    --network host \
    -v "${LOADTEST_DIR}:/lt" \
    "${common_env[@]}" \
    -e AUTH_TOKEN -e ALLOW_WRITES=true -e DURATION="${DURATION}" -e PAY_NOW="${PAY}" \
    -e STRIPE_SECRET_KEY \
    "${K6_IMAGE}" run /lt/k6/booking-funnel.js
else
  docker run --rm -i \
    --user "$(id -u):$(id -g)" \
    --network host \
    -v "${LOADTEST_DIR}:/lt" \
    "${common_env[@]}" \
    -e "PEAK_VUS=${VUS}" -e "SMOKE=${SMOKE}" \
    "${K6_IMAGE}" run /lt/k6/read-path.js
fi
