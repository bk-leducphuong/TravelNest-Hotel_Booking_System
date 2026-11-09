// src/router/routes/join.routes.js
export default [
  {
    path: '/join',
    name: 'Join',
    component: () => import('@/views/JoinHome.vue')
  },
  {
    path: '/join/become-a-host',
    name: 'JoinForm',
    component: () => import('@/views/JoinForms.vue'),
    // The partner-onboarding API requires authentication, so send anonymous
    // visitors through login first (they return here afterwards).
    meta: { requiresAuth: true }
  }
]
