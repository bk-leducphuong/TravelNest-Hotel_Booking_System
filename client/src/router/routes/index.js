// src/router/routes/index.js
import authRoutes from './auth.routes';
import joinRoutes from './join.routes';
import mainRoutes from './main.routes';
import bookingRoutes from './booking.routes';
import messagingRoutes from './messaging.routes';
import accountRoutes from './account.routes';
import reviewRoutes from './review.routes';
import notfoundRoutes from './notfound.routes';

/**
 * Every guest route accepts an optional Vietnamese prefix: `/vi/hotels/...`.
 * English stays unprefixed so existing URLs and search results keep working.
 */
const LOCALE_SEGMENT = '/:locale(vi)?';

function withLocale(path) {
  if (path === '/') return LOCALE_SEGMENT;
  // The catch-all has to stay last and still match `/vi/<unknown>`.
  if (path === '/:pathMatch(.*)*') return `${LOCALE_SEGMENT}/:pathMatch(.*)*`;
  return `${LOCALE_SEGMENT}${path}`;
}

const routes = [
  ...authRoutes,
  ...joinRoutes,
  ...mainRoutes,
  ...bookingRoutes,
  ...messagingRoutes,
  ...accountRoutes,
  ...reviewRoutes,
  ...notfoundRoutes,
];

export default routes.map((route) => ({ ...route, path: withLocale(route.path) }));
