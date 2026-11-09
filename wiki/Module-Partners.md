# Partners Module

`server/modules/partners` owns outbound affiliate integrations: flights and airport
transfers today, any other partner service later. It stores no data — it builds the
partner's deep link from configuration so the affiliate id never ships in the client
bundle.

## Ownership

| Concern | Notes |
|---|---|
| Partner registry | `application/getPartnerLink.js` maps a service name to its env vars |
| URL building | `domain/partnerLink.js` fills and validates the template |
| Guest API | `api/partners.routes.js` |

## Guest API — `/api/v1/partners`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/links?service=flights\|transfers&…` | public | Returns `{ service, provider, url }` |

Search parameters (`origin`, `destination`, `departDate`, `returnDate`, `adults`,
`children`, `cabinClass`, `pickup`, `dropoff`, `pickupDate`, `pickupTime`,
`passengers`, `luggage`) are permissive. The template decides which ones matter, and
a blank value is dropped from the URL — that is what makes a one-way flight work with
the same template as a return flight.

## Configuration

```
PARTNER_FLIGHTS_URL_TEMPLATE=https://partner.example/search?from={origin}&to={destination}&date={departDate}&affilid=YOUR_ID
PARTNER_FLIGHTS_NAME=Example Air
PARTNER_TRANSFERS_URL_TEMPLATE=
PARTNER_TRANSFERS_NAME=
```

- The partner programme issues the template; do not invent URL shapes in code.
- Only `http`/`https` templates are accepted.
- Values are URL-encoded; `utm_source=travelnest`, `utm_medium=affiliate` and
  `utm_campaign=<service>` are added when absent.
- An empty template disables the service: the API returns
  `503 PARTNER_NOT_CONFIGURED` and the guest page explains that it is not available.

## Guest client

- Routes `/flights` and `/transfers` (`client/src/views/`).
- `client/src/services/partners.service.js` asks the API for the link.
- The result panel always renders a `rel="noopener noreferrer sponsored"` link, so a
  blocked popup still has a working fallback.

## Adding a service

1. Add an entry to `SERVICES` in `application/getPartnerLink.js`.
2. Add `PARTNER_<SERVICE>_URL_TEMPLATE` / `PARTNER_<SERVICE>_NAME`.
3. Allow the service in `api/partners.schema.js`.
4. Add a client route and page, plus `en`/`vi` strings.

## Policy

Affiliate links are disclosed in the UI. The site does not embed partner iframes or
partner tracking pixels, so no third-party cookies are set and the existing
`cookie_consent` flow does not need to gate these pages. Payment, cancellation and
support remain with the partner; nothing here joins the booking/Stripe flow.
