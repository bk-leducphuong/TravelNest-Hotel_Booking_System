// src/router/routes/index.js
import authRoutes from './auth.routes'
import joinRoutes from './join.routes'
import mainRoutes from './main.routes'
import bookingRoutes from './booking.routes'
import accountRoutes from './account.routes'
import reviewRoutes from './review.routes'
import notfoundRoutes from './notfound.routes'

export default [
  ...authRoutes,
  ...joinRoutes,
  ...mainRoutes,
  ...bookingRoutes,
  ...accountRoutes,
  ...reviewRoutes,
  ...notfoundRoutes
]
