// src/router/routes/booking.routes.js
export default [
  {
    path: '/book',
    name: 'Book',
    component: () => import('@/views/Book.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/book/complete',
    name: 'BookingConfirmation',
    component: () => import('@/views/BookingConfirmation.vue'),
    props: (route) => ({
      bookingCode: route.query.bookingCode
    }),
    meta: { requiresAuth: true }
  },
  {
    path: '/bookings',
    name: 'Bookings',
    component: () => import('@/views/Bookings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/bookings/:bookingCode',
    name: 'BookingDetails',
    component: () => import('@/views/BookingDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/bookings/:bookingCode/cancel',
    name: 'BookingCancellation',
    component: () => import('@/views/BookingCancellation.vue'),
    meta: { requiresAuth: true }
  }
]
