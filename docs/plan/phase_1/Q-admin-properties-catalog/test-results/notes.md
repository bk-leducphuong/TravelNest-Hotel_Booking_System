# Q — Admin Properties / Catalog: Supplementary evidence

## Q-F1 / Q-F2 — timezone

Model (`modules/catalog/infrastructure/models/hotel.model.js`):

```js
timezone: {
  type: DataTypes.STRING(50),
  allowNull: true,
  validate: { isIn: [[...IANA_TIMEZONES]] },
}
```

`constants/hotels.js` `IANA_TIMEZONES` (partial):

```
America/New_York, America/Los_Angeles, America/Chicago, Europe/London, Europe/Paris,
Europe/Berlin, Asia/Tokyo, Asia/Singapore, Asia/Bangkok, Australia/Sydney,
Pacific/Auckland, Europe/Amsterdam
```

Server log for the 500:

```
PATCH /api/v1/admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002 500
msg: "Error: Validation error: Validation isIn on timezone failed"
stack: SequelizeValidationError: Validation error: Validation isIn on timezone failed
```

Reproduction (owner token):

```
PATCH /admin/hotels/<own> { "timezone":"Asia/Bangkok" }        -> 200   (listed)
PATCH /admin/hotels/<own> { "timezone":"Asia/Ho_Chi_Minh" }    -> 500   (Vietnam — not listed)
```

Joi schema: `timezone: Joi.string().max(64)` (no enum) → the mismatch reaches Sequelize.

## Policies update/delete (corrected)

```
POST   /admin/hotels/<own>/policies       -> 201 (id under data.policy.id)
PATCH  /admin/hotels/<own>/policies/<id>  -> 200
DELETE /admin/hotels/<own>/policies/<id>  -> 200
```

(The `api.md` Q-API-15/17 404s were caused by an empty id from a wrong extraction path.)
