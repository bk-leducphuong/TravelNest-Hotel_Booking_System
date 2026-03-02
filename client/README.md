# TravelNest Client (User Web App)

This package is the user-facing web application for TravelNest.
It allows guests to search for accommodations, view property details, make bookings, manage their trips, and leave reviews.

## Tech Stack

- **Framework**: Vue 3
- **Build Tool**: Vite
- **Routing & State**:
  - Vue Router
  - Vuex + `vuex-persist` for persisted state
- **UI & UX**:
  - Element Plus component library
  - Flatpickr for date picking
  - Custom SCSS styling
- **Maps & Geolocation**:
  - Leaflet
  - `@vue-leaflet/vue-leaflet`
- **Internationalization**: `vue-i18n` (e.g. Vietnamese and English)
- **Realtime & Notifications**:
  - `socket.io-client` for realtime updates
  - `vue-toastification` and `vue-loading-overlay`
- **Payments**: `@stripe/stripe-js`
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A running instance of the TravelNest API (see `server/README.md`)

### Install Dependencies

```bash
cd client
npm install
```

### Environment Variables

Create a `.env` file in the `client` directory (or `.env.local`).
Typical variables (names may differ depending on your configuration):

- `VITE_API_BASE_URL` – base URL of the TravelNest API
- `VITE_SOCKET_URL` – Socket.IO endpoint (often same host as API)
- `VITE_STRIPE_PUBLIC_KEY` – Stripe publishable key
- Any additional `VITE_*` variables used for maps, analytics, etc.

> All Vite environment variables must start with `VITE_`.  
> Check the `src` configuration files (e.g. API client or config modules) to see the exact variable names used.

## Run the App

### Development

```bash
cd client
npm run dev
```

The app will start on `http://localhost:5173` by default (or the port configured in Vite).

### Production Build

```bash
cd client
npm run build
```

The built static files will be output to `dist/`.  
In production these files are typically served by Nginx as part of the deployment stack (see `deploy/README.md`).

### Preview Production Build

```bash
cd client
npm run preview
```

## Linting & Formatting

```bash
# Lint and auto-fix
npm run lint

# Run a stricter auto-fix pass on src
npm run lint:fix

# Format using Prettier
npm run format
```

## Testing

There is currently no dedicated unit/e2e test suite configured for this package.
Testing is mainly done via manual QA and higher-level end-to-end tests.

> If you add a test setup (e.g. Vitest + Playwright), consider adding scripts like `npm run test` and documenting them here.

## Roadmap

- [ ] Add component/unit test coverage with Vitest and Vue Test Utils.
- [ ] Add end-to-end tests (e.g. Playwright or Cypress) for core booking flows.
- [ ] Improve accessibility (ARIA attributes, keyboard navigation, color contrast).
- [ ] Optimize bundle size and introduce route-level code splitting where needed.
- [ ] Enhance offline resilience and error states for flaky network conditions.

