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

The client uses Vitest for unit/component tests and Playwright for end-to-end tests.

```bash
# All tests
npm run test

# Unit tests
npm run test:unit

# Component tests
npm run test:component

# End-to-end tests (Playwright)
npm run test:e2e
```

## Project Structure

```
src/
├── assets/styles/   SCSS variables, mixins, global styles
├── components/      Reusable UI components grouped by domain
├── config/          App configuration
├── locales/         en.json, vi.json (i18n)
├── request/         HTTP request/response helpers
├── router/          Route definitions + guards
├── services/        API service modules
├── stores/          Vuex modules (state, getters, mutations, actions)
├── utils/           Utility functions
└── views/           Page-level views
```

## Roadmap

- [ ] Improve accessibility (ARIA attributes, keyboard navigation, color contrast).
- [ ] Optimize bundle size and introduce route-level code splitting where needed.
- [ ] Enhance offline resilience and error states for flaky network conditions.

---

📖 See the **[Wiki: Frontend Development](https://github.com/bk-leducphuong/TravelNest/wiki/Frontend-Development)** for more details.

