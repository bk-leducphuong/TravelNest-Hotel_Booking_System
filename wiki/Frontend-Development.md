# Frontend Development

TravelNest has two frontend applications: a user-facing app (Vue 3) and an admin dashboard (Nuxt 4).

---

## User Client (`client/`)

Vue 3 SPA for guests to browse, search, book hotels, and leave reviews.

### Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Routing**: Vue Router
- **State**: Vuex + vuex-persist
- **UI**: Element Plus, custom SCSS
- **Maps**: Leaflet + @vue-leaflet/vue-leaflet
- **i18n**: vue-i18n (English, Vietnamese)
- **HTTP**: Axios
- **Payments**: @stripe/stripe-js
- **Realtime**: socket.io-client

### Project Structure

```
client/src/
├── assets/styles/   SCSS variables, mixins, global styles
├── components/      Reusable UI components (grouped by domain)
├── config/          App configuration
├── locales/         en.json, vi.json
├── request/         HTTP request/response helpers
├── router/          Route definitions + guards (auth, admin)
├── services/        API service modules (17 modules)
├── stores/          Vuex modules (7 stores)
├── utils/           Utility functions
└── views/           17 page-level views
```

### Development

```bash
cd client
npm run dev       # http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

### Key Conventions

- **ES Modules** (`import`/`export`)
- **i18n**: Update both `en.json` and `vi.json` when changing text
- **Vuex stores** split into `state.js`, `getters.js`, `mutations.js`, `actions.js`
- **Component naming**: Domain-grouped directories under `components/`
- **Environment variables**: Must use `VITE_` prefix

---

## Admin Client (`admin-client/`)

Nuxt 4 application for property owners and administrators.

### Tech Stack

- **Framework**: Nuxt 4 (Vue 3)
- **State**: Pinia
- **Styling**: Tailwind CSS, Element Plus
- **TypeScript**: vue-tsc for type checking
- **Testing**: Vitest, @vue/test-utils, Playwright

### Project Structure

```
admin-client/
├── pages/           File-based routes
├── layouts/         Nuxt layouts
├── middleware/      Route middleware (auth guards)
├── stores/          Pinia stores
├── composables/     Reusable composables (useApiFetch)
├── tests/           Unit, Nuxt, E2E tests
├── nuxt.config.ts   Nuxt configuration
├── vitest.config.ts
└── playwright.config.ts
```

### Development

```bash
cd admin-client
npm run dev            # http://localhost:8000
npm run build          # Production build
npm run generate       # Static site generation
```

### Key Conventions

- **ES Modules** + **TypeScript**
- **Environment variables**: Browser-exposed vars need `NUXT_PUBLIC_` prefix
- **File-based routing** via Nuxt pages directory
- **Pinia stores** for state management
- **Nuxt middleware** for auth/route protection
