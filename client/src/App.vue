<script>
  import { mapActions, mapGetters } from 'vuex';
  import socketService from '@/services/socket';

  export default {
    name: 'App',
    data() {
      return {
        hotels: [],
        socketConnected: false,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated', 'getUserId']),
    },
    watch: {
      isUserAuthenticated: {
        handler(isAuthenticated) {
          if (isAuthenticated) {
            this.connectSocket();
          } else {
            this.disconnectSocket();
          }
        },
        immediate: true,
      },
    },
    mounted() {
      const language = localStorage.getItem('language')
        ? localStorage.getItem('language')
        : navigator.language || navigator.userLanguage;
      this.updateUserLanguage(language);
      this.$i18n.locale = language.split('-')[0];

      // Fetch user location and update Vuex store
      this.getUserLocation()
        .then((location) => {
          this.updateUserLocation(location);
        })
        .catch((error) => {
          console.error('Failed to get user location:', error);
        });

      // Initialize socket connection if user is already authenticated
      if (this.isUserAuthenticated) {
        this.connectSocket();
      }
    },
    beforeUnmount() {
      this.disconnectSocket();
    },
    methods: {
      ...mapActions('user', ['updateUserLocation', 'updateUserLanguage']),
      ...mapActions('auth', ['checkAuth']),

      async connectSocket() {
        if (!this.isUserAuthenticated || this.socketConnected) {
          return;
        }

        try {
          const socket = socketService.connect('/user', true);

          socket.on('connect', () => {
            console.log('Socket connected to /user namespace from App.vue');
            this.socketConnected = true;
          });

          socket.on('disconnect', () => {
            console.log('Socket disconnected from /user namespace');
            this.socketConnected = false;
          });

          console.log('Socket service initialized in App.vue');
        } catch (error) {
          console.error('Error connecting to socket:', error);
          this.socketConnected = false;
        }
      },

      disconnectSocket() {
        if (this.socketConnected) {
          socketService.disconnect('/user');
          this.socketConnected = false;
          console.log('Socket disconnected from App.vue');
        }
      },

      handleConsent(accepted) {
        if (accepted) {
          this.initializeTracking();
        } else {
          this.disableTracking();
        }
      },
      initializeTracking() {
        console.log('Tracking initialized');
      },
      disableTracking() {
        console.log('Tracking disabled');
      },
      getUserLocation() {
        if ('geolocation' in navigator) {
          return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                };
                resolve(userLocation);
              },
              (error) => {
                console.error('Error getting user location:', error);
                reject(error);
              }
            );
          });
        } else {
          console.error('Geolocation is not supported by this browser.');
          return Promise.reject('Geolocation not supported');
        }
      },
    },
  };
</script>

<template>
  <!-- <cookie-consent @consent-given="handleConsent" /> -->
  <RouterView />
</template>

<style scoped></style>
