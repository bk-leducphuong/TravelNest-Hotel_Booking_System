---
name: travelnest-prod-ops
description: Operate and inspect TravelNest production — the Hetzner VPS (ssh hetzner), the k3s/Argo CD cluster, prod MySQL/Redis/MongoDB via Cloudflare Tunnel, Cloudflare, Hetzner Cloud, and Grafana Cloud. Use when debugging prod, checking Argo CD sync/health, reading prod logs or databases, or inspecting infrastructure. For local dev use the travelnest-local-infra skill instead.
metadata:
  audience: maintainers
  workflow: production-ops
---

## What I do

Route every production question to the right tool, and make clear which access
path is read-only vs. mutating.

## When to use me

Use this for anything touching the TravelNest **production** environment: the
Hetzner VPS, the k3s cluster, the prod databases, Cloudflare, or Grafana Cloud.
If you actually mean local dev, use `travelnest-local-infra`.

## Access paths

| Target                          | Command                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| Prod VPS (deploy user, sudo OK) | `ssh hetzner` / `ssh hetzner-root`                                |
| Prod cluster                    | `ssh hetzner 'sudo kubectl ...'` (kubectl needs sudo on the host) |
| Prod MySQL / Redis / MongoDB    | `cloudflared access tcp` (or straight from the VPS)               |
| Cloudflare                      | `cf`, `cloudflared`                                               |
| Hetzner Cloud                   | `hcloud` (context `default-project`)                              |
| Grafana Cloud                   | `gcx`                                                             |

The VPS host is `travelnest-test`. There is **no prod kubeconfig on this
laptop** — the default `kubectl` context points at an unrelated AWS EKS cluster
(SessionUp), so always reach prod k8s through `ssh hetzner`.

## Cluster status (read-only)

```bash
ssh hetzner 'sudo kubectl get nodes'
ssh hetzner 'sudo kubectl -n argocd get applications \
  -o custom-columns="NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status"'
ssh hetzner 'sudo kubectl get pods -A -o wide | grep -vE "Completed|Running"'
ssh hetzner 'sudo kubectl -n travelnest logs deploy/api --tail=200'
```

The `argocd` CLI is installed locally but its server (`argocd.deployserver.work`)
sits behind Cloudflare Access; prefer the `kubectl -n argocd` commands above.

## Prod databases

Two options. Credentials come from the gitignored `deploy/k8s/.env.prod`
(`DB_USER`/`DB_PASSWORD`, `REDIS_PASSWORD`, `MONGODB_USER`/`MONGODB_PASSWORD`).

**A. From the laptop, via Cloudflare Tunnel** (`deploy/hetzner/db-access/README.md`).
The host port-forwards are already running on the VPS loopback:

```bash
cloudflared access tcp --hostname mysql.deployserver.work   --url 127.0.0.1:3306
cloudflared access tcp --hostname redis.deployserver.work   --url 127.0.0.1:6379
cloudflared access tcp --hostname mongodb.deployserver.work --url 127.0.0.1:27017
# then point mysql / mongosh at 127.0.0.1:<port>
```

Non-interactive use should use the Cloudflare Access service tokens already
stored under `~/.cloudflared/*-token` instead of the browser email-OTP flow.

**B. Straight into the pods** (no tunnel, no host ports):

```bash
set -a; . deploy/k8s/.env.prod; set +a         # local creds — never print them
ssh hetzner "sudo kubectl -n travelnest exec -it mysql-0   -- mysql -u '$DB_USER' -p'$DB_PASSWORD' '$DB_NAME'"
ssh hetzner "sudo kubectl -n travelnest exec -it redis-0   -- redis-cli -a '$REDIS_PASSWORD' PING"
ssh hetzner "sudo kubectl -n travelnest exec -it mongodb-0 -- mongosh '$MONGODB_URI'"
```

(Outer double quotes expand locally; the injected password is briefly visible in
the remote process list — prefer option A for anything long-lived.)

`mysql`, `mongosh`, and `redis-cli` are installed on this laptop, so option A is
usually the most convenient. `mc` (MinIO client) is **not** installed — use the
MinIO console (`storage.deployserver.work`) or the S3 API instead.

## Infrastructure

```bash
hcloud server list
hcloud server describe travelnest-test

cf dns records list -z deployserver.work
cf zero-trust access applications list
cloudflared tunnel list
```

Tunnel `travelnest` = `f3cf83fa-a17c-4e1e-ae43-8c2774b0def8`, locally-managed,
run by the `cloudflared.service` unit on the VPS. Relevant host units:
`cloudflared.service`, `k3s.service`, `travelnest-portforward@{mysql,redis,mongodb}.service`.

## Monitoring (Grafana Cloud)

K8s/host metrics ship to Grafana Cloud (Alloy → remote_write; pipelines managed
by Fleet Management). The token is sealed in
`deploy/k8s/monitoring/secrets/secret.enc.yaml` (SOPS/age).

```bash
gcx commands          # full, agent-consumable command metadata
gcx alert rules list
gcx dashboards list
gcx cloud stacks list
gcx fleet pipelines list
```

## Deploys

GitOps only: merge to `master` → GitHub Actions builds & pushes a multi-arch
image → the workflow promotes the `sha-*` tag into `deploy/k8s/apps/*/overlays/prod/`
→ Argo CD auto-syncs. See `deploy/docs/CICD.md`.

Validate manifests before committing:

```bash
deploy/scripts/validate-manifests.sh
```

Do **not** `kubectl apply` prod workloads by hand — that fights Argo CD's
`selfHeal`. The image is ARM64 (Hetzner CAX21), so keep builds multi-arch.

## Safety

- Read-only first: `get`/`describe`/`list`/`logs`.
- Anything mutating prod (`kubectl apply|delete|patch|scale`, `argocd sync|rollback`,
  `hcloud ... delete`, `sops`, DB writes) needs explicit user approval and a
  stated impact. The project `opencode.jsonc` already prompts for many of these.
- Never print credentials from `deploy/k8s/.env.prod` or the port-forward units.
