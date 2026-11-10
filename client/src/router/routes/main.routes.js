// src/router/routes/main.routes.js
// Home is imported eagerly so the landing page paints without an extra chunk
// request; the heavier views are loaded on demand.
import HomeView from '@/views/HomeView.vue';

export default [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/hotels/:hotel_id',
    name: 'HotelDetails',
    component: () => import('@/views/HotelDetails.vue'),
  },
  {
    path: '/search',
    name: 'SearchResults',
    component: () => import('@/views/SearchResults.vue'),
  },
];
