# Schema

Migrations are the single source of truth for the MySQL schema. `sequelize.sync()`
is no longer used to create schema in any deployed environment (it remains only in
the integration-test bootstrap).

## `baseline.sql`

`baseline.sql` is the canonical, generated snapshot of the full DDL for a fresh
database. It is applied by the first migration,
`infra/database/migrations/20260101000000-baseline-schema.js`, which runs before
every other migration. Because it uses `CREATE TABLE IF NOT EXISTS`, it is a no-op
on databases whose tables were originally created by `sequelize.sync()`.

**Do not edit `baseline.sql` by hand.** Regenerate it from the models:

```bash
# from server/
npm run db:schema:dump
```

This creates a throwaway database, runs `sequelize.sync({ force: true })`, dumps
the resulting DDL and drops the throwaway database. The generated file is then
applied by the baseline migration.

### Why a baseline instead of only incremental migrations

Before this, a fresh database was built by `sequelize.sync()` and the 16 migrations
only added tables on top. That meant the schema had two sources of truth, model
edits silently never reached existing databases (`sync` does not `ALTER`), and a
new environment could not be reproduced from the repository alone. Now migrations
alone reproduce the schema, and the baseline makes evolving that schema explicit.

## Drift check

```bash
# from server/
npm run schema:check
```

Builds two throwaway databases — one from migrations, one from
`sequelize.sync({ force: true })` — and compares their tables and columns. It fails
if a model changed without a matching migration. CI runs this on every backend
change and the image build depends on it.

The check needs `CREATE DATABASE` privileges. Set `DB_ADMIN_USER` /
`DB_ADMIN_PASSWORD` when the application user does not have them (for example
`DB_ADMIN_USER=root` with the local docker-compose, where only root can create
databases).

## Timestamps & soft delete

- New models should use `timestamps: true` with `createdAt: 'created_at'` /
  `updatedAt: 'updated_at'` so Sequelize maintains both columns.
- Legacy models use `timestamps: false` and declare the columns explicitly. Their
  `updated_at` now carries `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  (see `20260928000000-add-on-update-timestamps`) so the database maintains it even
  though Sequelize does not. When adding such a model, include that clause.
- Soft delete is **not** consistent today: `images` uses a hand-managed
  `deleted_at` column (`paranoid: false`), and `bookings` has an unused
  `deleted_at` column. Decide per entity: either enable Sequelize `paranoid: true`
  (and rely on `deleted_at`), or drop the column. Do not add a `deleted_at` column
  without the matching query behaviour.

## Index conventions

Declare each index **once**, as a named entry in the model's `indexes` array:

```js
indexes: [{ name: 'idx_code', unique: true, fields: [{ name: 'code' }] }];
```

Do **not** also set `unique: true` on the attribute. `sequelize.sync()` re-applies
attribute-level `UNIQUE` during its column-reconcile pass, which creates a second
(and sometimes third) identical index — e.g. `name`, `name_2`, `unique_role_name`.
That is exactly the redundancy the `20260927000000-deduplicate-indexes` migration
cleaned up.

For `belongsToMany` through-tables, keep the explicit unique index on the through
model and pass `unique: false` in the association:

```js
Model.belongsToMany(Other, {
  through: { model: models.through_table, unique: false },
});
```

Otherwise Sequelize adds an implicit composite unique index on top of the explicit
one. `npm run schema:check` fails if any table ends up with two indexes on the same
columns, or if a model index has no matching migration.

## Adding a migration

1. Change the model(s).
2. `npm run migrate:create -- --name add-<thing>-to-<table>`.
3. Write an idempotent `up`/`down` (see `infra/database/migration-utils/schema.js`:
   `addColumnIfMissing`, `addIndexIfMissing`, `createTableIfMissing`, ...).
4. Run `npm run schema:check` — it must report no drift.
5. Never edit a migration that has already been applied; add a new one.
