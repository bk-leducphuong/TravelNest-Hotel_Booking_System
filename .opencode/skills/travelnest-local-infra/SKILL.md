---
name: travelnest-local-infra
description: Inspect TravelNest local development data and the local k3d Kubernetes cluster — MySQL, Redis, MongoDB, MinIO, Elasticsearch, migrations, and seeds. Use when debugging local data, running make infra-*, querying the dev database/cache, or checking the local cluster. For the production VPS/cluster use the travelnest-prod-ops skill instead.
metadata:
  audience: maintainers
  workflow: local-dev
---

## What I do

Give the exact, correct commands to reach TravelNest's **local** infrastructure,
and the fallbacks to use when a CLI is missing on this machine.

## When to use me

Use this when you need to inspect local dev data or the local k3d cluster. If the
target is the **production** VPS or cluster, load `travelnest-prod-ops` instead —
mixing the two is the most common mistake here.

## Environment

The root `Makefile` helpers load `server/.env.development` by default (override
with `ENV_FILE=...`) and call the native CLIs. This is the preferred path — it
uses the same credentials the app uses.

```bash
make infra-check                                   # which CLIs are present
make infra-mysql ARGS="-e 'SHOW TABLES;'"
make infra-redis ARGS="PING"
make infra-minio
make infra-elasticsearch                           # defaults to _cluster/health?pretty
make infra-mongodb ARGS="--eval 'db.getCollectionNames()'"
```

Target a different env file when needed:

```bash
make infra-mysql ENV_FILE=server/.env.development ARGS="-e 'SELECT COUNT(*) FROM hotels;'"
```

Connection scripts live in `server/scripts/infra/`:

| Script             | Credentials used                          | Notes                                                |
| ------------------ | ----------------------------------------- | ---------------------------------------------------- |
| `mysql.sh`         | `MYSQL_CLI_*` → `DB_*`                    | dev compose publishes MySQL on `localhost:3307`      |
| `redis.sh`         | `REDIS_CLI_*` → `REDIS_*`                 | default DB index `1`                                 |
| `minio.sh`         | `MINIO_CLI_*` → `MINIO_*`                 | configures an `mc` alias; no args lists the bucket   |
| `elasticsearch.sh` | `ELASTICSEARCH_CLI_*` → `ELASTICSEARCH_*` | `curl`-based; first arg is the path                  |
| `mongodb.sh`       | `MONGODB_CLI_URI` → `MONGODB_URI`         | falls back to `localhost:27017/travelnest_analytics` |

## Missing CLIs (fallbacks)

`mc` (MinIO client) is **not** installed on this machine, so `make infra-minio`
will fail (`require_cli mc`). Use the local S3 API or console instead. The local
containers are named `minio`, `travelnest-mysql`, `travelnest-redis`,
`travelnest-mongodb` (see `server/infra/docker-compose.yml`).

```bash
# MinIO / S3 (in place of `make infra-minio`)
aws s3 ls --endpoint-url http://localhost:9000 s3://uploads
# or use the MinIO console (minio container publishes :9001)
```

`redis-cli` **is** installed, so `make infra-redis` works. If you ever need to
run it inside the container instead:

```bash
docker exec -it travelnest-redis redis-cli PING
docker exec -it travelnest-redis redis-cli -n 1 KEYS 'sess:*'
```

## Stripe (local webhooks)

The Stripe CLI is installed. The API runs on `localhost:3000` and the raw-body
webhook route is `POST /api/v1/webhooks/stripe` (mounted in `server/app.js`).

```bash
stripe login                                          # one-time
stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe
stripe trigger payment_intent.succeeded
```

`stripe listen` prints a `whsec_...` signing secret — put it in
`STRIPE_WEBHOOK_SECRET` in `server/.env.development`. Keep the webhook route
raw-body compatible (`bodyParser.raw`); do not move JSON parsing in front of it.

## Local Kubernetes (k3d)

The local cluster is `k3d-travelnest`. Its kubeconfig is separate from your
default one:

```bash
KUBECONFIG=~/.kube/travelnest-local.yaml kubectl get pods -A
KUBECONFIG=~/.kube/travelnest-local.yaml kubectl -n travelnest get svc
```

Do **not** assume the default `kubectl` context — it currently points at an
unrelated AWS EKS cluster (SessionUp), not TravelNest.

## Migrations & seeds

From `server/` (or via `yarn workspace @travelnest/server <script>`):

```bash
npm run migrate
npm run migrate:status
npm run seed:all:quick
npm run es:setup-hotels
npm run es:seed-hotels
npm run mongo:seed:search_logs
npm run mongo:seed:hotel_views
```

## Safety

- Prefer read-only SQL/queries while debugging.
- For destructive commands, state the exact data impact first and get explicit
  user approval.
