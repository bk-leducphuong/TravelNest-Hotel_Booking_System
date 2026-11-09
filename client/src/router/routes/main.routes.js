// src/router/routes/main.routes.js
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
  {
    path: '/flights',
    name: 'Flights',
    component: () => import('@/views/Flights.vue'),
  },
  {
    path: '/transfers',
    name: 'Transfers',
    component: () => import('@/views/Transfers.vue'),
  },
];
