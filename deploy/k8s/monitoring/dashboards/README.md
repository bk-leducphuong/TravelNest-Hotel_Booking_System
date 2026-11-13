# Dashboards

Dashboards this repository owns. Import them manually
(**Dashboards → New → Import → upload JSON**), pick the Grafana Cloud
Prometheus data source, and keep the `TravelNest` folder.

Do not fork the Grafana-managed Kubernetes / MySQL / Redis integration
dashboards; they update with the stack.

| File                              | UID                          | Audience          | Answers                                                                         |
| --------------------------------- | ---------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `travelnest-api-performance.json` | `travelnest-api-performance` | Backend on-call   | Is the API slow or erroring, on which route, and is MySQL/Redis/Node the cause? |
| `travelnest-booking-funnel.json`  | `travelnest-booking-funnel`  | Product + backend | How long from hold to confirmed booking, and is conversion healthy?             |

## Rules

- One dashboard per audience and decision — not per service or per environment.
  `cluster` (and `route`, where relevant) is a variable.
- Row 1 must answer "is it broken?" in under five seconds.
- Every alert in `../alerts/README.md` links back to one of these dashboards with
  variables pre-set.
- If a dashboard has not been opened during an incident or review in a quarter,
  delete it.

## Source metrics

All series come from the `travelnest-api` and `travelnest-worker` jobs
(`server/platform/metrics`), plus `kube_*`/`node_*` for capacity. See
`../README.md` for the PromQL cookbook.
