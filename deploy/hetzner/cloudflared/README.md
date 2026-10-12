# Cloudflare Tunnel — TravelNest VPS ingress

Public ingress for the TravelNest k3s cluster runs **outside** the cluster on the
VPS host via **Cloudflare Tunnel**. TLS is terminated by Cloudflare at the edge;
`cloudflared` forwards each hostname as plain HTTP to **k3s Traefik on
`localhost:80`** (published by k3s ServiceLB). Traefik routes by the `Host`
header, which `cloudflared` preserves.

> Ports 80/443 are **not** opened on the host — `cloudflared` is outbound-only, so
> the Cloudflare firewall/ufw rule allowing only `22/tcp` still holds.

## Tunnel

| | |
|---|---|
| Name | `travelnest` |
| ID | `f3cf83fa-a17c-4e1e-ae43-8c2774b0def8` |
| Management | **locally-managed** (`config_src: local`) |
| Runtime | systemd unit `cloudflared.service` on the VPS host |
| Account | `938ceca1e7de73dcb1f962d4c48a462e` |
| Zone | `deployserver.work` |

## Hostnames

| Hostname | Backend (in k3s) |
|---|---|
| `deployserver.work` | `frontend:80` |
| `api.deployserver.work` | `api:3000` |
| `admin.deployserver.work` | `admin-client:80` |
| `superadmin.deployserver.work` | `superadmin-client:80` |
| `storage.deployserver.work` | `minio:9000` |
| `keycloak.deployserver.work` | `keycloak:8080` |

All six DNS records are **proxied** `CNAME`s pointing at
`f3cf83fa-a17c-4e1e-ae43-8c2774b0def8.cfargotunnel.com`.

## Install (on the VPS host)

```bash
sudo deploy/hetzner/cloudflared/install-cloudflared.sh
```

The script installs `cloudflared` (arm64), derives the locally-managed
credentials file from the tunnel token (`cf tunnels token get`), installs
`/etc/cloudflared/config.yml` + the systemd unit, and starts the service.

### Credentials

Locally-managed tunnels need a **credentials file** at
`/etc/cloudflared/<tunnel-id>.json` containing `AccountTag`, `TunnelID`,
`TunnelSecret`. It is derived from the tunnel token:

```bash
cf tunnels token get f3cf83fa-a17c-4e1e-ae43-8c2774b0def8
# token = base64url(JSON {a: account, t: tunnel, s: secret})
# creds = {"AccountTag": a, "TunnelID": t, "TunnelSecret": s}
```

> The credentials file and the token are **secrets** — never commit them. This
> repo only versions `config.yml` and the systemd unit.

## DNS management (`cf` CLI)

```bash
# list
cf dns records list -z deployserver.work

# add a hostname
cf dns records create -z deployserver.work --body \
  '{"type":"CNAME","name":"HOST.deployserver.work","content":"f3cf83fa-a17c-4e1e-ae43-8c2774b0def8.cfargotunnel.com","proxied":true,"ttl":1}'

# delete (needs --force)
cf dns records delete -z deployserver.work <record-id> --force
```

## Zone SSL/TLS mode

Set to **Full** (Cloudflare edge → `cloudflared` is always encrypted; the last
hop `cloudflared` → Traefik is plain HTTP). Override only if you see a redirect
loop:

```bash
cf zones settings get  ssl -z deployserver.work
cf zones settings edit ssl -z deployserver.work --value full
```

## Zone must not be paused

A **paused** zone (`zones get` → `"paused": true`) makes Cloudflare serve DNS
only and bypass the proxy entirely, so the proxied CNAMEs to the tunnel stop
working. Check and resume it:

```bash
cf zones get  -z deployserver.work                       # look at "paused"
cf zones edit -z deployserver.work --paused=false        # resume
```

## Verify

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
cloudflared tunnel --config /etc/cloudflared/config.yml ingress rule https://api.deployserver.work
systemctl status cloudflared
cf tunnels get f3cf83fa-a17c-4e1e-ae43-8c2774b0def8   # status: healthy
```

Note: until **k3s + Traefik** are installed, requests return **502 Bad Gateway**
(there is nothing listening on `localhost:80` yet). That is expected.

## Caveats

- The app Ingresses in `deploy/k8s/apps/*/overlays/prod` still carry
  `cert-manager.io/cluster-issuer` annotations and `tls:` blocks. There is no
  cert-manager on the VPS (Cloudflare terminates TLS); these are inert over the
  tunnel but should be stripped separately.
- `cloudflared` → `localhost:80` depends on k3s ServiceLB publishing Traefik's
  `web` entrypoint on the host.
