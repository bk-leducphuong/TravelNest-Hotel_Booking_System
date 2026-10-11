# Bounded Context

The internal shape every module (today) and service (tomorrow) shares. The same
layout already exists under `server/modules/<name>/`; this is the rule set it
must satisfy when the refactor is finished.

```mermaid
flowchart LR
  subgraph CTX["Bounded context — <module> today, deployable service tomorrow"]
    direction TB
    api["api/<br/>REST + event consumers"]
    app["application/<br/>domain-shaped use-cases<br/>(confirmBooking, recordRefundSucceeded…)"]
    dom["domain/<br/>pure rules · state machines"]
    infra["infrastructure/<br/>repositories + adapters"]
    ev["events/<br/>producers + idempotent subscribers"]
    idx["index.js<br/>public interface — use-cases only"]
  end

  api --> app
  app --> dom
  app --> infra
  app --> ev
  ev --> app
  idx --> app

  infra --> own[("own tables only")]
  ev --> port["EventPublisher port<br/>(in-process subscribers kept)"]
  port --> adapter["NATS adapter<br/>+ outbox for critical events"]
  adapter --> bus[("NATS JetStream")]
  bus --> api

  other["Other contexts"] -. "call use-cases only — never infra/models" .-> idx
```

## Rules

- `api/` and `events/` are the only inbound edges; `index.js` is the only
  outbound edge.
- `application/` owns orchestration; `domain/` is pure and has no I/O.
- `infrastructure/` is the only layer allowed to touch the ORM, and only the
  context's own tables.
- Cross-context access is a use-case call (or a domain event), never a deep
  import and never a query into another context's tables.
- In-process subscribers stay; events additionally publish through the
  `EventPublisher` port so remote services can consume them.
