# TravelNest — Hetzner (CAX21) Deployment Plan

> Target: [Hetzner CAX21](https://www.hetzner.com/cloud) · Ubuntu 24.04 · k3s + Argo CD + KSOPS
> Elasticsearch = Elastic Cloud trial · MySQL / Redis / MinIO / NATS / Keycloak / MongoDB in-cluster
> Domains: `deployserver.work` + subdomains · Public IPv4 + IPv6

---

## 1. Chosen configuration (final)

| Item | Decision |
|---|---|
| Provider / plan | Hetzner **CAX21** — shared vCPU, cost-optimized |
| Spec | 4 vCPU / 8 GB RAM / 80 GB NVMe |
| Architecture | **ARM64** (Ampere) |
| Location | EU-central (Falkenstein / Nuremberg) |
| OS | Ubuntu 24.04 |
| Networking | Public IPv4 + IPv6 |
| Runtime | **k3s** (ships Traefik + default local-path StorageClass) |
| GitOps | **Argo CD + KSOPS** (SOPS + age) |
| Images | Docker Hub `docker.io/leducphuong/travelnest-*` |
| Elasticsearch | **External** — Elastic Cloud trial |
| MongoDB | **In-cluster** |
| MySQL / Redis / MinIO / NATS / Keycloak | **In-cluster** |
| Ingress / TLS | **Cloudflare Tunnel** → Traefik |
| Domain | Keep `deployserver.work` (+ `api.`, `admin.`, `superadmin.`, `keycloak.`, `storage.`) |

### Measured local resource baseline
Running containers ≈ **5.2 GiB** (Elasticsearch ~3.16 GiB is the biggest consumer). With Elasticsearch externalized, the in-cluster footprint is much smaller.

### 8 GB fit check (Elasticsearch external)
In-cluster **requests** ≈ **3.5 GiB**:
- mysql 512Mi, keycloak 768Mi, api 512Mi, worker/media/analytics/notification 256Mi each, minio 256Mi, mongodb 256Mi, frontend/admin/superadmin 64Mi each
- + k3s (~0.4 GiB) + Argo CD (~0.6–1.0 GiB)

Steady state ≈ 4–5 GB. Fits, but keep MySQL's buffer pool modest and monitor. If pods get evicted → upgrade to CAX31 (8 vCPU / 16 GB).

---

## 2. Key architectural finding

The **prod** environment root was a frame that assumed **RDS MySQL, ElastiCache Redis and S3/MinIO were managed AWS services**, so it deployed only NATS, Keycloak and the applications.

The **local** environment root deploys the full in-cluster set (mysql, redis, minio, nats, keycloak, mongodb, elasticsearch).

➡️ **Decision: repurpose `environments/prod` as the single self-contained VPS environment — no new `vps` root.** It now deploys MySQL, Redis, MinIO, MongoDB, NATS and Keycloak in-cluster; only Elasticsearch stays external (Elastic Cloud). The prod app overlays already hardcode `deployserver.work`.

**Good news:** the prod frontend already bakes `https://api.deployserver.work`, so keeping the domain means the existing CI frontend image works unchanged.

---

## 3. ARM64 prerequisite — multi-arch images

All 7 image workflows currently hardcode `platforms: linux/amd64`, so the app images will **crash with `exec format error` on CAX21**.

Affected workflows:
```
.github/workflows/backend.yml
.github/workflows/frontend.yml
.github/workflows/admin-client.yml
.github/workflows/superadmin-client.yml
.github/workflows/analytics-service.yml
.github/workflows/media-service.yml
.github/workflows/notification-service.yml
```

Each image workflow requests both `linux/amd64` and `linux/arm64`.

> Superseded: the original plan added `docker/setup-qemu-action` and built both
> architectures in one job. That runs the `arm64` leg under QEMU emulation on an
> x86 runner, where emulated Node/native builds abort with
> `qemu: uncaught target signal 4 (Illegal instruction)` — and BuildKit does not
> surface it, so the build step hung until the job timeout and promotion never
> ran. All image workflows now build one native leg per architecture
> (`ubuntu-latest` + `ubuntu-24.04-arm`, free for public repositories) and stitch
> the two by-digest images into a manifest list in
> `.github/workflows/_publish-image.yml`.

All Dockerfiles use multi-arch bases (`node:22-alpine`, `golang:1.22-alpine`, `alpine:3.20`, `nginx:alpine`), so no Dockerfile changes are needed.

**Verify before deploying:**
```bash
docker buildx imagetools inspect docker.io/leducphuong/travelnest-api:develop
# must list linux/amd64 AND linux/arm64 — repeat for all 8 app images
```

Infra images are already multi-arch and fine: `mysql:8.0`, `redis:7-alpine`, `mongo:7`, `nats:2.10-alpine`, `quay.io/minio/minio`, `quay.io/keycloak/keycloak:26.0`, `amazon/aws-cli`.

---

## 4. Implementation phases

### Phase 1 — Provision infrastructure
1. Hetzner Cloud project → create **CAX21**, Ubuntu 24.04, EU-central, IPv4 + IPv6, add SSH key.
2. **Firewall:** allow only `22/tcp` (scoped to your IP). Keep 80/443 closed — Cloudflare Tunnel handles public ingress.
3. **DNS (Cloudflare):** `deployserver.work`, `api.`, `admin.`, `superadmin.`, `keycloak.`, `storage.` → tunnel.
4. **Ubuntu prep:** non-root sudo user, `unattended-upgrades`, 4 GB swap file (recommended on 8 GB), `ufw` allowing only 22.

### Phase 2 — Multi-arch ARM64 images (prerequisite)
See section 3.

### Phase 3 — Repurpose the `prod` environment
`environments/prod` now deploys the self-contained stack:
- *in-cluster infra (wave 10):* `infra/mysql/overlays/prod`, `infra/redis`, `infra/minio/overlays/prod`, `infra/mongodb`, `infra/nats`, `infra/keycloak/overlays/prod`
- *apps (waves 20–40):* analytics, media, notification, api, worker, frontend, admin-client, superadmin-client (prod overlays, correct domains)
- **no** in-cluster Elasticsearch (external)
- MongoDB moved from `local/mongodb` → `infra/mongodb` (shared by the prod and local roots)

The existing `infra/mysql/overlays/prod` backup CronJob already targets **in-cluster MinIO** (`http://minio:9000`), so it works self-contained — no AWS dependency.

### Phase 4 — Secrets
- `deploy/k8s/.env.prod` (copy of the updated `.env.prod.example`) now uses **in-cluster** values:
  - `DB_HOST=mysql`, `REDIS_HOST=redis`, `MINIO_ENDPOINT=minio`, `MINIO_PORT=9000`, `MINIO_USE_SSL=false`, `MEDIA_MINIO_ENDPOINT=minio:9000`
  - `MONGODB_URI=mongodb://mongodb:27017/travelnest_analytics`
  - `KC_DB_URL_HOST=mysql`
  - `ELASTICSEARCH_ENDPOINT/HOSTS/API_KEY` = Elastic Cloud
  - JWT/session secrets, Keycloak admin, etc.
- `deploy/scripts/secrets/init-age-key.sh`, then `deploy/scripts/secrets/seal-prod-secrets.sh` renders + encrypts the prod `secret.enc.yaml` files.
- **Keep the age private key off the VPS.**

### Phase 5 — Elastic Cloud trial
1. Start Elastic Cloud trial → get HTTPS endpoint + API key.
2. Confirm which env vars the API actually reads (prod configmap sets `ELASTICSEARCH_USERNAME/PASSWORD` empty + `ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED=true`; `ELASTICSEARCH_API_KEY` lives in the secret). Align API-key vs basic-auth with the code.
3. Apply the `hotels` index mapping and ILM policy (see `deploy/scripts/setup-hotels-index.sh`, `deploy/docs/ELASTICSEARCH_ILM.md`) against the Elastic Cloud endpoint.
4. ⚠️ **Trial is 14 days** — plan a paid tier or self-hosted ES before it expires, or search breaks.

### Phase 6 — k3s + Argo CD
1. Install k3s on Ubuntu 24.04 ARM; confirm Traefik + a default local-path StorageClass (both required by the manifests).
2. Install Argo CD; patch for KSOPS (`deploy/scripts/secrets/install-argo-ksops.sh`).
3. `kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml` (the existing prod root, which points at `environments/prod`).
4. Sync is not wave-ordered → let it converge via selfHeal. Optionally enable progressive syncs + `RollingSync`.

### Phase 7 — Data bootstrap
1. Ensure `api-secret` exists before first sync (PreSync migration-hook caveat).
2. Run migrations + quick seed (`deploy/k8s/local/jobs/`), then upload sample images once MinIO + api are up.

### Phase 8 — Edge & finalize
1. Install `cloudflared`; route the tunnel to Traefik for all 6 hostnames.
2. Import the Keycloak realm (ships without users — register, or run the migration scripts under `server/scripts/keycloak/`).
3. Confirm the CI frontend image works (domain matches). Admin/superadmin likewise.
4. **Ingress TLS / cert-manager** — the `keycloak`, `api`, `frontend` and `admin-client` Ingresses carry `cert-manager.io/cluster-issuer: letsencrypt-prod` + `tls:` blocks, but there is no cert-manager on the VPS (Cloudflare Tunnel terminates TLS). Strip those annotations and `tls:` blocks, or install cert-manager if in-cluster TLS is wanted.

### Phase 9 — Validate / harden
- Pod-level: no OOMKills; `kubectl top pods` steady state within budget.
- Backups: enable Hetzner snapshots; the in-cluster MySQL→MinIO backup CronJob (`infra/mysql/overlays/prod`) already runs.
- Storage is node-local (k3s local-path) — fine for a single-node test.

---

## 5. Deliverables (files to create / modify)

| Action | Path |
|---|---|
| Done ×7 | `.github/workflows/{backend,frontend,admin-client,superadmin-client,analytics-service,media-service,notification-service}.yml` |
| Updated | `deploy/k8s/environments/prod/applicationset.yaml` (add in-cluster infra) |
| Moved | `deploy/k8s/local/mongodb` → `deploy/k8s/infra/mongodb` |
| Updated | `deploy/k8s/environments/local/applicationset.yaml` (mongodb path) |
| Updated | `deploy/k8s/.env.prod.example` (in-cluster values) |
| Updated | `deploy/k8s/README.md` |

---

## 6. Open items to resolve during implementation

1. **ES auth mode** in the server code (API key vs basic auth) — align with Elastic Cloud.
2. **superadmin host** — confirm `superadmin.deployserver.work` and add it to the tunnel.
3. **targetRevision** — the prod root tracks `master`; merge the manifest changes before the first sync (or temporarily point it at the branch under test).

---

## 7. Cost estimate (Hetzner, monthly, excl. VAT)

| Item | Approx. cost |
|---|---|
| CAX21 (4 vCPU / 8 GB / 80 GB, ARM) | ~€5–7 |
| Public IPv4 | ~€0.50 |
| Snapshots/backups (≈20% of VM) | ~€1 |
| Egress | 20 TB included (free) |
| Cloudflare Tunnel | free |
| Elastic Cloud trial | free for 14 days, then paid |
| **Total (trial period)** | **~€7–9 / mo** |

> ⚠️ Verify the exact CAX21 price/availability at signup — Hetzner had 2026 price adjustments.

---

## 8. Prerequisites already in place (from this repo)

- `deploy/k8s/` — Kubernetes + Argo CD GitOps manifests (apps, infra, environments, bootstrap).
- `deploy/scripts/secrets/` — SOPS + age init/seal scripts.
- `deploy/scripts/setup-hotels-index.sh` — Elasticsearch index setup.
- `.github/workflows/*` — CI builds and pushes images to Docker Hub.
- Manifest assumptions documented in `deploy/k8s/README.md` (default StorageClass, Traefik, external TLS, Image Updater).
