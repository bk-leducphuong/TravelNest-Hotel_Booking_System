# MinIO → Cloudflare R2 migration

Move object storage off the in-cluster MinIO (Hetzner 164 GB network volume)
to Cloudflare R2, then decommission the volume.

## Why

| Item | Current |
| --- | --- |
| Hetzner volume `volume-hel1-1` (164 GB, network-attached) | ~$12.58/mo |
| Objects | 491,245 across 2 buckets |
| `uploads` | 491,226 objects / ~79 GiB |
| `travelnest-backups` | 19 objects / 4.9 GiB |
| MinIO pod memory limit | 512 Mi (restart-looping under load) |

R2 keeps the same S3 API, charges only for stored bytes (~$1.26/mo for 84 GiB)
and has no egress fees.

## Status

Phases 1–2 are **complete** (2026-10-31):

| | |
| --- | --- |
| Objects in R2 | 245,615 (only keys referenced by `images.object_key`) |
| Bytes | 70.1 GiB |
| Verification | 0 missing / 0 extra keys; 10/10 sampled MD5s identical |
| Backups | 20 objects / 5.1 GiB, byte-identical |
| Public path | `https://media.deployserver.work/<key>` returns the object |

Two things learned during the copy:

- **Requires rclone >= 1.75.** rclone 1.60 (Ubuntu 24.04's package) returns
  `501 NotImplemented` on every PUT against R2 and silently retries 3x, dropping
  throughput to ~1 object/s. With 1.75 it sustained ~25 objects/s.
- The MinIO pod must have its CPU limit raised first (see #162). It was throttled
  ~97% of periods at a 500m limit, so liveness probes failed and the server was
  killed mid-transfer every few minutes.

## Invariants

- **Object keys must not change.** `images.object_key` in MySQL stores relative
  keys (`city/<uuid>/<uuid>.avif`); no URLs are persisted anywhere.
- **The MinIO volume is the rollback path.** Do not detach or delete it until
  Phase 4, after a soak period.

## Phase 0 — Prerequisites

1. Enable R2 once via the dashboard (`dash.cloudflare.com` → R2 → accept terms).
   The API returns `10042 Please enable R2 through the Cloudflare Dashboard`
   until this is done.
2. Create buckets `uploads` and `travelnest-backups`.
3. Create an **R2 API token** (Object Read & Write, scoped to both buckets).
   Note the S3 endpoint `<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`.
4. Attach a custom domain to the `uploads` bucket, e.g.
   `media.deployserver.work`. R2 serves a bucket at the **root** of its domain,
   so the `/uploads` path segment disappears from public URLs.

## Phase 1 — Mirror with rclone

Run from the VPS host. **Never run listings inside the `minio` pod** — it has a
512 Mi limit and a recursive listing OOM-kills the server.

```bash
# source access over loopback
sudo kubectl -n travelnest port-forward svc/minio 19000:9000   # keep in tmux
```

`~/.config/rclone/rclone.conf` (credentials from `kubectl get secret minio-secret`):

```ini
[minio]
type = s3
provider = Minio
access_key_id = <MINIO_ROOT_USER>
secret_access_key = <MINIO_ROOT_PASSWORD>
endpoint = http://127.0.0.1:19000
region = us-east-1

[r2]
type = s3
provider = Cloudflare
access_key_id = <R2_TOKEN_ID>
secret_access_key = <R2_TOKEN_SECRET>
endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
region = auto
acl = private
```

Baseline, then copy. Use `copy`, never `sync` — `sync` may delete on the
destination.

```bash
rclone size minio:uploads --json

rclone copy minio:uploads r2:uploads \
  --transfers 4 --checkers 8 --retries 10 --low-level-retries 20 \
  --stats 30s --stats-one-line --log-file /tmp/r2-uploads.log

rclone copy minio:travelnest-backups r2:travelnest-backups --transfers 2
```

Re-running is safe: completed objects are skipped.

## Phase 2 — Verify

```bash
rclone size minio:uploads --json
rclone size r2:uploads --json

# multipart ETags differ between MinIO and R2 → compare sizes, not hashes
rclone check minio:uploads r2:uploads --size-only --one-way

# key-set equality
rclone lsf -R minio:uploads --files-only | sort > /tmp/keys-minio.txt
rclone lsf -R r2:uploads   --files-only | sort > /tmp/keys-r2.txt
diff /tmp/keys-minio.txt /tmp/keys-r2.txt
```

Referential check — every `images.object_key` must exist in R2:

```sql
SELECT object_key FROM images;   -- 245,615 rows
```

```bash
# dump keys to /tmp/keys-db.txt, then:
comm -23 <(sort /tmp/keys-db.txt) /tmp/keys-r2.txt   # must be empty
```

End-to-end spot check:

```bash
curl -sI https://media.deployserver.work/<object_key>   # 200, image/avif
```

## Phase 3 — Cut over

1. Scale `media` and `worker` to 0, run a final delta `rclone copy`, re-verify.
2. Update `deploy/k8s/.env.prod`:

```ini
MINIO_ENDPOINT=<ACCOUNT_ID>.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_REGION=auto
MINIO_BUCKET=uploads
MEDIA_MINIO_ENDPOINT=<ACCOUNT_ID>.r2.cloudflarestorage.com
PUBLIC_OBJECT_BASE_URL=https://media.deployserver.work
MINIO_ACCESS_KEY=<R2_TOKEN_ID>
MINIO_SECRET_KEY=<R2_TOKEN_SECRET>
```

3. Reseal secrets: `./deploy/scripts/secrets/seal-prod-secrets.sh`.
4. Media service must send a region to minio-go
   (`services/media/internal/storage/minio.go` currently omits `Region`, which
   makes it sign with `us-east-1`; R2 expects `auto`).
5. Update GitHub repo variables `VITE_MINIO_URL` and `NUXT_PUBLIC_MEDIA_BASE` to
   `https://media.deployserver.work`, then rebuild client/admin/superadmin —
   these are baked in at build time.
6. Repoint the backup CronJob
   (`deploy/k8s/infra/mysql/overlays/prod/backup-cronjob.yaml` hardcodes
   `endpoint="http://minio:9000"`).
7. Scale `media`/`worker` back up and confirm Argo CD is synced.

## Phase 4 — Remove the volume

Only after a soak period with no rollback needed.

```bash
kubectl delete pvc minio-data -n travelnest   # PV has Prune=false
# remove BOTH fstab entries: /mnt/minio and the `none bind` line
sudo umount /var/lib/rancher/k3s/storage/pvc-481f* /mnt/minio
sudo systemctl daemon-reload
hcloud volume detach 107101922
hcloud volume delete 107101922                # irreversible
```

Then delete the `minio` app from Argo CD. Root disk ends at ~20 GB / 75 GB used.

## Rollback

Until Phase 4, the MinIO volume still holds every object. Reverting means
restoring the previous `.env.prod` values, resealing, and rebuilding the
frontends at the old `VITE_MINIO_URL`.

## Known cleanup opportunity

491,226 objects exist but only 245,615 are referenced by `images` — roughly
half the `uploads` bucket is orphaned. Pruning before migration would halve
both R2 cost and migration time; see `server/scripts/clear-seed-data.js` for the
known prefixes (`hotel/`, `room/`, `city/`, `country/`, `hotels/`).
