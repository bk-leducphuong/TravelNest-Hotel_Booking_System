<script>
  import AiChatWidget from './components/ai-chat/AiChatWidget.vue';
  import { ElConfigProvider } from 'element-plus';
  import en from 'element-plus/es/locale/lang/en';
  import vi from 'element-plus/es/locale/lang/vi';
  export default {
    name: 'App',
    components: { AiChatWidget, ElConfigProvider },
    computed: {
      widgetLocale() {
        return this.$i18n.locale === 'vi' ? vi : en;
      },
      pageTitle() {
        const names = {
          Home: 'home',
          SearchResults: 'search',
          HotelDetails: 'hotel',
          Book: 'checkout',
          BookingDetails: 'booking',
          BookingConfirmation: 'booking',
          Bookings: 'bookings',
          SavedHotels: 'saved',
          AccountSettings: 'account',
          Login: 'login',
          BookingCancellation: 'cancel',
          Reviews: 'reviews',
          ReviewDetails: 'writeReview',
          SettingDetails: 'settings',
          Join: 'partner',
          JoinForm: 'onboarding',
          NotFound: 'notFound',
        };
        const key = names[this.$route.name];
        return key ? `${this.$t(`guest.page.${key}`)} · TravelNest` : 'TravelNest';
      },
    },
    watch: {
      pageTitle: {
        immediate: true,
        handler(value) {
          document.title = value;
        },
      },
      '$i18n.locale': {
        immediate: true,
        handler(value) {
          document.documentElement.lang = value === 'vi' ? 'vi' : 'en';
        },
      },
    },
    mounted() {
      const preferred = (localStorage.getItem('language') || navigator.language || 'en').split(
        '-'
      )[0];
      this.$i18n.locale = preferred === 'vi' ? 'vi' : 'en';
      this.$store.dispatch('user/updateUserLanguage', this.$i18n.locale);
    },
  };
</script>
<template>
  <ElConfigProvider :locale="widgetLocale"
    ><div class="app-root"><RouterView /><AiChatWidget /></div
  ></ElConfigProvider>
</template>
<style scoped>
  .app-root {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
