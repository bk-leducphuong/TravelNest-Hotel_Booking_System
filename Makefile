ENV_FILE ?= server/.env.development
ARGS ?=

.PHONY: infra-mysql infra-redis infra-minio infra-check \
	loadtest loadtest-local loadtest-smoke loadtest-funnel loadtest-funnel-pay \
	loadtest-remote loadtest-cleanup loadtest-cleanup-local \
	load-test-read load-test-booking

infra-mysql:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/mysql.sh $(ARGS)

infra-redis:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/redis.sh $(ARGS)

infra-minio:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/minio.sh $(ARGS)

infra-check:
	@missing=0; \
	command -v mysql >/dev/null || { echo "missing: mysql"; missing=1; }; \
	command -v redis-cli >/dev/null || { echo "missing: redis-cli"; missing=1; }; \
	command -v mc >/dev/null || { echo "missing: mc"; missing=1; }; \
	command -v curl >/dev/null || { echo "missing: curl"; missing=1; }; \
	exit $$missing

# Load testing. One command each — run.sh resolves the target, the exemption and
# the guest token. See loadtest/RUNBOOK.md.
#   make loadtest               read path against prod
#   make loadtest-local         read path against localhost:3000
#   make loadtest-funnel        booking funnel (no payment)
#   make loadtest-funnel-pay    funnel + Stripe test payment
#   make loadtest-remote        read path from an ephemeral Hetzner VM
#   make loadtest-cleanup       delete load-test rows from prod
loadtest:
	@./loadtest/scripts/run.sh $(ARGS)

loadtest-local:
	@./loadtest/scripts/run.sh --local $(ARGS)

loadtest-smoke:
	@./loadtest/scripts/run.sh --smoke $(ARGS)

loadtest-funnel:
	@./loadtest/scripts/run.sh --funnel $(ARGS)

loadtest-funnel-pay:
	@./loadtest/scripts/run.sh --funnel --pay $(ARGS)

loadtest-remote:
	@./loadtest/scripts/run.sh --remote $(ARGS)

loadtest-cleanup:
	@./loadtest/scripts/cleanup.sh

loadtest-cleanup-local:
	@./loadtest/scripts/cleanup.sh --local

# Back-compat aliases.
load-test-read: loadtest
load-test-booking: loadtest-funnel
