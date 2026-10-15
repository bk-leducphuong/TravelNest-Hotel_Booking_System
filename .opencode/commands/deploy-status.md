---
description: Read-only TravelNest production status — Argo CD sync/health, pod issues, host health, and Grafana alerts
---

Give a concise, read-only status report of the TravelNest production
environment. Do NOT run anything that mutates state (no apply/delete/sync/sync
overrides, no DB writes). Follow the `travelnest-prod-ops` skill for access
details.

Run these and summarise the results:

1. Argo CD application sync + health:
   `ssh hetzner 'sudo kubectl -n argocd get applications -o custom-columns="NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status"'`
2. Any pods not Running/Completed:
   `ssh hetzner 'sudo kubectl get pods -A -o wide'`
3. Recent prod API errors (last ~200 lines):
   `ssh hetzner 'sudo kubectl -n travelnest logs deploy/api --tail=200'`
4. Host health: disk, memory, and the key units:
   `ssh hetzner 'df -h /; free -h; systemctl is-active k3s cloudflared travelnest-portforward@mysql travelnest-portforward@redis travelnest-portforward@mongodb'`
5. Grafana Cloud firing alerts (if `gcx` is authenticated):
   `gcx alert rules list`

Report as a short table of Argo CD apps (name / sync / health), any pod or unit
problems, and any firing alerts. If a check cannot run, say which command failed
and why — do not retry with broadened permissions.
