# API Reference

All API endpoints are mounted under `/api/v1` and documented with OpenAPI/Swagger.

> **Live Swagger docs**: [api.deployserver.work/api-docs](https://api.deployserver.work/api-docs)

## Route Overview

| Route File | Base Path | Description |
|---|---|---|
| `auth.routes.js` | `/api/v1/auth` | Registration, login, logout, OAuth |
| `booking.routes.js` | `/api/v1/bookings` | Create, manage, cancel reservations |
| `hotel.routes.js` | `/api/v1/hotels` | CRUD for hotels and rooms |
| `search.routes.js` | `/api/v1/search` | Hotel search, autocomplete, destinations |
| `review.routes.js` | `/api/v1/reviews` | Create, read, update reviews + replies |
| `user.routes.js` | `/api/v1/users` | Profile, settings, saved hotels |
| `payment.routes.js` | `/api/v1/payments` | Stripe payments, refunds |
| `hold.routes.js` | `/api/v1/holds` | Temporary booking holds |
| `image.routes.js` | `/api/v1/images` | Image upload and serving |
| `notification.routes.js` | `/api/v1/notifications` | List, mark read |
| `analytics.routes.js` | `/api/v1/analytics` | Analytics data |
| `join.routes.js` | `/api/v1/join` | Become-a-host flow |
| `webhook.routes.js` | `/api/v1/webhooks` | Stripe webhooks |
| `health.routes.js` | `/health` | Health check |

## Authentication

The API uses session-based authentication with Passport.js strategies for Google and Twitter OAuth.

### Common Headers

```http
Cookie: connect.sid=<session-id>
Content-Type: application/json
```

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create a new account |
| POST | `/api/v1/auth/login` | Log in |
| POST | `/api/v1/auth/logout` | Log out |
| GET | `/api/v1/auth/me` | Get current user |

## Common Patterns

### Pagination

List endpoints support pagination via query params:

```http
GET /api/v1/hotels?page=1&limit=20
```

### Error Responses

```json
{
  "status": "error",
  "message": "Validation error",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

### Success Responses

```json
{
  "status": "success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Additional Endpoints

- `GET /health` — Health check (no auth required)
- `/admin/queues` — Bull Board queue monitoring dashboard
- `GET /api-docs` — Swagger UI
