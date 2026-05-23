<script>
import { mapActions } from 'vuex'
import AiChatWidget from './components/ai-chat/AiChatWidget.vue'

export default {
  name: 'App',
  components: {
    AiChatWidget
  },
  data() {
    return {
      hotels: [],
    }
  },
  mounted() {
    const language = localStorage.getItem('language') ? localStorage.getItem('language') : navigator.language || navigator.userLanguage
    this.updateUserLanguage(language)
    this.$i18n.locale = language.split('-')[0]

    // Fetch user location and update Vuex store
    this.getUserLocation()
      .then((location) => {
        this.updateUserLocation(location) // Dispatch action to update user location
      })
      .catch((error) => {
        console.error('Failed to get user location:', error)
        // You can handle the error here, e.g., show a default location
      })
  },
  methods: {
    ...mapActions('user', ['updateUserLocation', 'updateUserLanguage']),
    ...mapActions('auth', ['checkAuth']),
    handleConsent(accepted) {
      if (accepted) {
        // User accepted cookies, you can initialize tracking here
        this.initializeTracking()
      } else {
        // User rejected cookies, respect their choice
        this.disableTracking()
      }
    },
    initializeTracking() {
      // Initialize your tracking scripts, analytics, etc.
      console.log('Tracking initialized')
    },
    disableTracking() {
      // Disable or remove tracking scripts
      console.log('Tracking disabled')
    },
    getUserLocation() {
      if ('geolocation' in navigator) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
              resolve(userLocation)
            },
            (error) => {
              console.error('Error getting user location:', error)
              reject(error) // Important to reject on error
            }
          )
        })
      } else {
        console.error('Geolocation is not supported by this browser.')
        return Promise.reject('Geolocation not supported')
      }
    },
  }
}
</script>

<template>
  <div class="app-root">
    <!-- <cookie-consent @consent-given="handleConsent" /> -->
    <RouterView />
    <AiChatWidget />
  </div>
</template>

<style scoped>
.app-root {
  width: 100%;
  min-height: 100%;
}
</style>
