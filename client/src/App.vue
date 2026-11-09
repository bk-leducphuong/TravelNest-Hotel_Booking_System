<script>
  import AiChatWidget from './components/ai-chat/AiChatWidget.vue';
  import en from 'element-plus/es/locale/lang/en';
  import vi from 'element-plus/es/locale/lang/vi';
  import { applySeoMeta, isPrerenderedPage } from './utils/seo';
  export default {
    name: 'App',
    components: { AiChatWidget },
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
        return key ? `${this.$t(`guest.page.${key}`)} · Trestay` : 'Trestay';
      },
    },
    watch: {
      pageTitle: {
        immediate: true,
        handler(value) {
          // Prerendered hotel pages ship their own <title>; don't clobber it
          // unless the visitor has navigated to a different route.
          if (!isPrerenderedPage(this.$route.path)) {
            document.title = value;
          }
          applySeoMeta(this.$route, this.$i18n);
        },
      },
      '$i18n.locale': {
        immediate: true,
        handler(value) {
          document.documentElement.lang = value === 'vi' ? 'vi' : 'en';
          applySeoMeta(this.$route, this.$i18n);
        },
      },
    },
    mounted() {
      // The URL decides the active language (see router guards); only sync the
      // stored preference so it follows the visitor between sessions.
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
