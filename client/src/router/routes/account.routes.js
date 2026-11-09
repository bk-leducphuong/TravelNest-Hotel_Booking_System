// src/router/routes/account.routes.js
export default [
  {
    path: '/account-settings',
    name: 'AccountSettings',
    component: () => import('@/views/account-settings/AccountSettings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/account-settings/:details',
    name: 'SettingDetails',
    component: () => import('@/views/account-settings/SettingDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/saved-hotels',
    name: 'SavedHotels',
    component: () => import('@/views/SavedHotels.vue'),
    meta: { requiresAuth: true }
  }
]
