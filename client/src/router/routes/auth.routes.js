// src/router/routes/auth.routes.js
export default [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  }
]
