// src/router/routes/review.routes.js
export default [
  {
    path: '/reviews',
    name: 'Reviews',
    component: () => import('@/views/Reviews.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reviews/review-details',
    name: 'ReviewDetails',
    component: () => import('@/views/ReviewDetails.vue'),
    props: (route) => ({
      bc: route.query.bc, // booking code
      hid: route.query.hid, // hotel id
      hn: route.query.hn // hotel name
    }),
    meta: { requiresAuth: true }
  }
]
