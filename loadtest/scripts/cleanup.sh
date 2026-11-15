#!/usr/bin/env bash
#
# Delete everything the load-test suites created: bookings, their payments,
# transactions, ledger entries, rooms and the holds they consumed.
#
#   ./loadtest/scripts/cleanup.sh          # production (via ssh hetzner)
#   ./loadtest/scripts/cleanup.sh --local  # the docker MySQL on this machine
#
# Safe to re-run. Prometheus counters are untouched, so dashboard history stays.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL="${SCRIPT_DIR}/cleanup-bookings.sql"

LOCAL="false"
case "${1:-}" in
  --local) LOCAL="true" ;;
  -h | --help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) printf 'unknown option: %s\n' "$1" >&2; exit 2 ;;
esac

[[ -f "${SQL}" ]] || { printf 'missing %s\n' "${SQL}" >&2; exit 1; }

if [[ "${LOCAL}" == "true" ]]; then
  printf 'cleaning load-test rows out of the local MySQL...\n'
  docker exec -i travelnest-mysql \
    sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -t' <"${SQL}" 2>&1 |
    grep -vE '^mysql: \[Warning\]'
else
  printf 'cleaning load-test rows out of production...\n'
  scp -q "${SQL}" hetzner:/tmp/loadtest-cleanup.sql
  ssh hetzner "sudo kubectl exec -i -n travelnest mysql-0 -- sh -c 'mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\" -t' < /tmp/loadtest-cleanup.sql 2>&1 | grep -vE '^mysql: \\[Warning\\]'; rm -f /tmp/loadtest-cleanup.sql"
fi
