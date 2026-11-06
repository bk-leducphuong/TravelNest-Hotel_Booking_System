// src/router/routes/main.routes.js
import HomeView from '@/views/HomeView.vue';
import HotelDetails from '@/views/HotelDetails.vue';
import SearchResults from '@/views/SearchResults.vue';

export default [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/hotels/:hotel_id',
    name: 'HotelDetails',
    component: HotelDetails,
  },
  {
    path: '/search',
    name: 'SearchResults',
    component: SearchResults,
  },
];
