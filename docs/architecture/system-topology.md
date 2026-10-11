# System Topology

Gateway, services, event backbone and the data stores each context owns.

```mermaid
flowchart TB
  subgraph C["Clients"]
    guest["Guest client (web / mobile)"]
    admin["Admin console"]
    staff["Property / staff tools"]
  end

  subgraph E["Edge — thin, no domain rules"]
    gw["Node.js API Gateway / BFF<br/>stable /api/v1/*<br/>auth · rate-limit · proxy · response enrichment"]
    kc["Keycloak<br/>identity provider"]
  end

  subgraph S["Go services (services/)"]
    identity["identity<br/>users · auth · roles · permissions"]
    catalog["catalog<br/>hotels · rooms · amenities · policies"]
    search["search<br/>queries + own projections"]
    booking["booking + inventory<br/>holds · room inventory · bookings"]
    payments["payments / ledger<br/>intents · transactions · refunds · payouts"]
    notifications["notifications<br/>in-app + email"]
    media["media<br/>images + variants"]
    analytics["analytics<br/>search logs · views · trends"]
  end

  bus[("NATS JetStream<br/>durable · at-least-once · replay")]

  subgraph D["Data — exactly one writer per table"]
    mysql[("MySQL<br/>owned table sets, per service")]
    mongo[("MongoDB<br/>analytics")]
    es[("Elasticsearch<br/>search index")]
    redis[("Redis<br/>cache + holds")]
    minio[("MinIO<br/>media objects")]
  end

  guest --> gw
  admin --> gw
  staff --> gw
  gw --> kc
  gw --> identity & catalog & search & booking & payments & notifications & media & analytics

  identity --- bus
  catalog --- bus
  search --- bus
  booking --- bus
  payments --- bus
  notifications --- bus
  media --- bus
  analytics --- bus

  identity --> mysql
  catalog --> mysql
  booking --> mysql
  payments --> mysql
  notifications --> mysql
  search --> es
  search -. "read-only projection source" .-> mysql
  analytics --> mongo
  media --> minio
  media -. "metadata read" .-> mysql
  booking --> redis
```

## Notes

- The gateway preserves `/api/v1/*` response shapes during migration; it
  proxies route groups to services as they reach parity and enriches responses
  (e.g. analytics returns hotel IDs, the gateway loads hotel cards).
- Dotted edges are read-only and documented in `wiki/Table-Ownership.md`;
  they are transitional and disappear once each service owns its projections.
- `services/{analytics,media,notification}` already exist in this repo.
