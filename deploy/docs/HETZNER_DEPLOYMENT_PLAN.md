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

The **prod** environment root is **not self-contained**. Its ApplicationSet deploys only NATS, Keycloak and the applications, assuming **RDS MySQL, ElastiCache Redis and S3/MinIO are managed AWS services**.

The **local** environment root deploys the full in-cluster set (mysql, redis, minio, nats, keycloak, mongodb, elasticsearch).

➡️ The VPS needs a **new `vps` environment root** — a hybrid:
- **prod's app overlays** (they already hardcode `deployserver.work` domains ✅)
- **local's in-cluster infra**, **minus** the in-cluster Elasticsearch (ES is external)

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

Changes per workflow:
1. Add `docker/setup-qemu-action` **before** `docker/setup-buildx-action`.
2. Change `platforms: linux/amd64` → `platforms: linux/amd64,linux/arm64`.
3. (Optional) per-arch cache refs — QEMU builds are ~2–4× slower for the Node/Go layers.

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

### Phase 3 — New `vps` environment (manifest work)
Create, modelled on `environments/prod` + `environments/local`:
- `deploy/k8s/environments/vps/kustomization.yaml` + `applicationset.yaml` → elements:
  - *in-cluster infra (wave 10):* `infra/mysql`, `infra/redis`, `infra/minio`, `infra/nats`, `infra/keycloak`, `local/mongodb`
  - *apps (waves 20–40):* analytics, media, notification, api, worker, frontend, admin-client, superadmin-client — reuse the **prod** overlays (correct domains)
  - **no** `local/elasticsearch` (external)
  - `targetRevision:` deploy branch (e.g. `master`)
- `deploy/k8s/bootstrap/argocd/root-application-vps.yaml` → points at `deploy/k8s/environments/vps`
- Infra overlay source: `infra/*/overlays/local` exist for mysql/minio/keycloak (k3s-compatible). **Avoid `infra/mysql/overlays/prod`** (adds an S3 backup CronJob). Verify local overlays don't hardcode k3d-specific values; if they do, add thin `overlays/vps`.
- App secrets: **recommend** dedicated `apps/*/overlays/vps/` + a `seal-vps-secrets.sh` (keeps prod and test values separate). Alternative: reuse prod overlays + `seal-prod-secrets.sh`.

### Phase 4 — Secrets
- `deploy/k8s/.env.vps` (copy of `.env.prod.example`) with **in-cluster** values:
  - `DB_HOST=mysql`, `REDIS_HOST=redis`, `MINIO_ENDPOINT=minio:9000`, `MINIO_USE_SSL=false`
  - `MONGODB_URI=mongodb://mongodb:27017/travelnest_analytics`
  - `ELASTICSEARCH_ENDPOINT=https://<id>.es.<region>.aws.cloud.es.io`
  - `ELASTICSEARCH_HOSTS=...`, `ELASTICSEARCH_API_KEY=<base64 key>`
  - `KC_DB_URL_HOST=mysql`, JWT/session secrets, Keycloak admin, etc.
- `deploy/scripts/secrets/init-age-key.sh`; then a `seal-vps-secrets.sh` (copy of the prod/local sealer pointed at vps paths).
- **Keep the age private key off the VPS.**

### Phase 5 — Elastic Cloud trial
1. Start Elastic Cloud trial → get HTTPS endpoint + API key.
2. Confirm which env vars the API actually reads (prod configmap sets `ELASTICSEARCH_USERNAME/PASSWORD` empty + `ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED=true`; `ELASTICSEARCH_API_KEY` lives in the secret). Align API-key vs basic-auth with the code.
3. Apply the `hotels` index mapping and ILM policy (see `deploy/scripts/setup-hotels-index.sh`, `deploy/docs/ELASTICSEARCH_ILM.md`) against the Elastic Cloud endpoint.
4. ⚠️ **Trial is 14 days** — plan a paid tier or self-hosted ES before it expires, or search breaks.

### Phase 6 — k3s + Argo CD
1. Install k3s on Ubuntu 24.04 ARM; confirm Traefik + a default local-path StorageClass (both required by the manifests).
2. Install Argo CD; patch for KSOPS (`deploy/scripts/secrets/install-argo-ksops.sh`).
3. `kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-vps.yaml`.
4. Sync is not wave-ordered → let it converge via selfHeal. Optionally enable progressive syncs + `RollingSync`.

### Phase 7 — Data bootstrap
1. Ensure `api-secret` exists before first sync (PreSync migration-hook caveat).
2. Run migrations + quick seed (`deploy/k8s/local/jobs/`), then upload sample images once MinIO + api are up.

### Phase 8 — Edge & finalize
1. Install `cloudflared`; route the tunnel to Traefik for all 6 hostnames.
2. Import the Keycloak realm (ships without users — register, or run the migration scripts under `server/scripts/keycloak/`).
3. Confirm the CI frontend image works (domain matches). Admin/superadmin likewise.

### Phase 9 — Validate / harden
- Pod-level: no OOMKills; `kubectl top pods` steady state within budget.
- Backups: enable Hetzner snapshots; add MySQL/MinIO backups (repoint or skip the prod S3 CronJob).
- Storage is node-local (k3s local-path) — fine for a single-node test.

---

## 5. Deliverables (files to create / modify)

| Action | Path |
|---|---|
| Modify ×7 | `.github/workflows/{backend,frontend,admin-client,superadmin-client,analytics-service,media-service,notification-service}.yml` |
| New | `deploy/k8s/environments/vps/{kustomization.yaml,applicationset.yaml}` |
| New | `deploy/k8s/bootstrap/argocd/root-application-vps.yaml` |
| New | `deploy/k8s/apps/*/overlays/vps/**` (if dedicated overlays) |
| New | `deploy/k8s/.env.vps` + `deploy/scripts/secrets/seal-vps-secrets.sh` |
| Verify | `deploy/k8s/infra/*/overlays/local` k3s-compat (or add `overlays/vps`) |

---

## 6. Open items to resolve during implementation

1. **ES auth mode** in the server code (API key vs basic auth) — align with Elastic Cloud.
2. **Which git revision** the `vps` root tracks (`master` after merge vs `develop`).
3. **Dedicated `vps` app overlays vs reusing `prod`** — affects where sealed secrets live.
4. **superadmin host** — confirm `superadmin.deployserver.work` and add to the tunnel.

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
