ENV_FILE ?= server/.env.development
ARGS ?=

.PHONY: infra-mysql infra-redis infra-minio infra-elasticsearch infra-mongodb infra-check

infra-mysql:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/mysql.sh $(ARGS)

infra-redis:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/redis.sh $(ARGS)

infra-minio:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/minio.sh $(ARGS)

infra-elasticsearch:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/elasticsearch.sh $(ARGS)

infra-mongodb:
	ENV_FILE="$(ENV_FILE)" server/scripts/infra/mongodb.sh $(ARGS)

infra-check:
	@missing=0; \
	command -v mysql >/dev/null || { echo "missing: mysql"; missing=1; }; \
	command -v redis-cli >/dev/null || { echo "missing: redis-cli"; missing=1; }; \
	command -v mc >/dev/null || { echo "missing: mc"; missing=1; }; \
	command -v curl >/dev/null || { echo "missing: curl"; missing=1; }; \
	command -v mongosh >/dev/null || { echo "missing: mongosh"; missing=1; }; \
	exit $$missing
