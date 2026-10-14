# Remote database access (Cloudflare Tunnel + Access)

This directory lets you reach the in-cluster **MySQL / Redis / MongoDB** from
anywhere — through the existing Cloudflare Tunnel, protected by Cloudflare
Access (email OTP) — **without opening any database port** on the VPS or
publishing the databases as raw public endpoints.

```
laptop                  Cloudflare edge            VPS host                        k3s (travelnest)
DBeaver ─▶ 127.0.0.1:3306
           cloudflared access tcp ─▶ mysql.deployserver.work ─▶ cloudflared ─▶ 127.0.0.1:13306 ─▶ svc/mysql:3306
                    (Access: email OTP)                  (this tunnel)          (port-forward unit)
```

Three pieces:

1. **Tunnel ingress** — `deploy/hetzner/cloudflared/config.yml` maps
   `mysql|redis|mongodb.deployserver.work` to `tcp://localhost:<port>`.
2. **Host port-forwards** — `travelnest-portforward@<name>.service` publishes the
   ClusterIP services on loopback (installed by `install-db-portforwards.sh`).
3. **Cloudflare Access** — an Access application per hostname (email OTP).

## 1. DNS + Access (Cloudflare, one-time)

```bash
# Proxyied CNAMEs pointing at the tunnel.
for h in mysql redis mongodb; do
  cf dns records create -z deployserver.work --body \
    "{\"type\":\"CNAME\",\"name\":\"${h}.deployserver.work\",\"content\":\"f3cf83fa-a17c-4e1e-ae43-8c2774b0def8.cfargotunnel.com\",\"proxied\":true,\"ttl\":1}"
done

# Access application per host (email OTP). Adjust the email(s).
cf zero-trust access identity-providers list        # find the One-Time PIN idp id
cf zero-trust access applications create --body '{
  "name": "TravelNest MySQL",
  "domain": "mysql.deployserver.work",
  "type": "self_hosted",
  "session_duration": "8h",
  "policies": [{
    "name": "Allow listed emails",
    "decision": "allow",
    "include": [{ "email": { "email": "you@example.com" } }]
  }]
}'
# repeat for redis.deployserver.work and mongodb.deployserver.work
```

> Access is the only thing guarding these endpoints. Keep the policy list tight.
> Do the same for the other two hostnames before relying on them.

## 2. Host port-forwards (on the VPS)

```bash
sudo deploy/hetzner/db-access/install-db-portforwards.sh
ss -ltnp | grep -E '13306|16379|27017'   # all four should show 127.0.0.1
```

Instances: `travelnest-portforward@{mysql,redis,mongodb}.service`
(`systemctl status travelnest-portforward@mysql`).

## 3. Client (laptop)

```bash
# MySQL
cloudflared access tcp --hostname mysql.deployserver.work --url 127.0.0.1:3306
# Redis
cloudflared access tcp --hostname redis.deployserver.work --url 127.0.0.1:6379
# MongoDB
cloudflared access tcp --hostname mongodb.deployserver.work --url 127.0.0.1:27017
```

Then point your client at `127.0.0.1:<port>` (DBeaver, TablePlus, `redis-cli`,
`mongosh`, …). The first connection opens a browser to complete the Access
email-OTP login.

Non-interactive clients (CI, scripts) should use an Access **service token**
instead of email OTP.

## Credentials

- **MySQL**: the app's `travelnest` user (`DB_USER` / `DB_PASSWORD` in
  `deploy/k8s/.env.prod`).
- **Redis / MongoDB**: authentication is enabled (see the `overlays/prod` for
  the `redis` and `mongodb` infra apps) — use `REDIS_PASSWORD` /
  `MONGODB_USER` + `MONGODB_PASSWORD` from `deploy/k8s/.env.prod`.

## Caveats

- `cloudflared access tcp` requires being logged into the same Cloudflare
  account (or holding a service token). That is what keeps the DBs private.
- Traffic is TLS to the edge and encrypted edge→tunnel; the last hop
  (`cloudflared` → loopback) is local to the host.
- If a port-forward unit dies, `systemctl restart travelnest-portforward@<name>`
  (they are `Restart=always`).
