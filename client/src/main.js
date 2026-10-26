import './assets/main.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import './assets/guest-theme.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import stores from './stores/index.js'; // import store
import { clickOutside } from '../directives/clickOutsite'; // import custom directives
import i18n from './config/i18n';
import 'leaflet';
import './assets/styles/index.scss';

if (window.location.pathname === '/silent-check-sso.html') {
  window.parent.postMessage(window.location.href, window.location.origin);
} else {
  const bootstrap = async () => {
    await stores.dispatch('auth/initializeAuth');
    const app = createApp(App);

    // add custom directives
    app.directive('click-outside', clickOutside);

    // Add i18n to the app instance
    app.use(i18n);
    app.use(stores);
    app.use(router);

    await router.isReady();
    app.mount('#app');
  };

  bootstrap();
}
