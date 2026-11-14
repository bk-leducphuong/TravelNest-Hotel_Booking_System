ENV_FILE ?= server/.env.development
ARGS ?=

# Load testing (see loadtest/README.md). These names match the k6 `__ENV`
# variables so `BASE_URL=... make load-test-read` works as documented.
BASE_URL ?= https://api.trestay.com
CITY ?= Hanoi
PEAK_VUS ?= 12
LOADTEST_IMAGE ?= grafana/k6:2.4.0
LOADTEST_DIR = loadtest
# SMOKE=true swaps the ramp for a 20 s two-VU run that only validates the script.
SMOKE ?= false

.PHONY: infra-mysql infra-redis infra-minio infra-check load-test-read load-test-booking

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

# Read-path load test. Anonymous, no writes.
#   make load-test-read
#   BASE_URL=http://localhost:3000 PEAK_VUS=25 make load-test-read
load-test-read:
	@mkdir -p $(LOADTEST_DIR)/results
	docker run --rm -i \
		--user "$(shell id -u):$(shell id -g)" \
		--network host \
		-v "$(CURDIR)/$(LOADTEST_DIR):/loadtest" \
		-e BASE_URL="$(BASE_URL)" \
		-e CITY="$(CITY)" \
		-e PEAK_VUS="$(PEAK_VUS)" \
		-e SMOKE="$(SMOKE)" \
		-e RESULT_DIR=/loadtest/results \
		$(LOADTEST_IMAGE) run /loadtest/k6/read-path.js $(ARGS)

# Booking funnel load test. Creates real holds and bookings, so it needs an
# explicit opt-in: AUTH_TOKEN=<keycloak token> ALLOW_WRITES=true.
# Both are passed to the container by name so the token never lands in argv.
#   AUTH_TOKEN=... ALLOW_WRITES=true DURATION=2m make load-test-booking
DURATION ?= 10m
load-test-booking:
	@test -n "$$AUTH_TOKEN" || { echo 'AUTH_TOKEN is required (see loadtest/README.md)'; exit 1; }
	@test "$$ALLOW_WRITES" = "true" || { echo 'ALLOW_WRITES=true is required: this suite writes real bookings'; exit 1; }
	@mkdir -p $(LOADTEST_DIR)/results
	docker run --rm -i \
		--user "$(shell id -u):$(shell id -g)" \
		--network host \
		-v "$(CURDIR)/$(LOADTEST_DIR):/loadtest" \
		-e BASE_URL="$(BASE_URL)" \
		-e CITY="$(CITY)" \
		-e AUTH_TOKEN \
		-e ALLOW_WRITES \
		-e DURATION="$(DURATION)" \
		$(LOADTEST_IMAGE) run /loadtest/k6/booking-funnel.js $(ARGS)
