<script>
  import TheFooter from '@/components/Footer.vue';
  import TheHeader from '@/components/Header.vue';
  import { accountSettingsSections } from './sections';

  export default {
    components: {
      TheHeader,
      TheFooter,
    },
    data() {
      return {
        sections: accountSettingsSections,
      };
    },
    methods: {
      openSection(slug) {
        this.$router.push(`/account-settings/${slug}`);
      },
    },
  };
</script>
<template>
  <TheHeader :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <p class="guest-subtitle">{{ $t('account.home.eyebrow') }}</p>
    <h1 class="guest-page-title">{{ $t('account.home.title') }}</h1>
    <p class="guest-subtitle">{{ $t('account.home.description') }}</p>
    <div class="account-section-grid">
      <article v-for="section in sections" :key="section.slug" class="guest-section">
        <span class="guest-pill">{{
          $t(section.available ? 'account.status.available' : 'account.status.comingSoon')
        }}</span>
        <h2>{{ $t(section.titleKey) }}</h2>
        <p class="guest-subtitle">{{ $t(section.summaryKey) }}</p>
        <RouterLink :to="`/account-settings/${section.slug}`" class="account-section-link"
          >{{ $t(section.ctaKey) }} →</RouterLink
        >
      </article>
    </div>
  </main>
  <TheFooter />
</template>
<style scoped>
  .account-section-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    margin-top: 32px;
  }
  .account-section-grid h2 {
    font-size: 20px;
    margin: 16px 0 8px;
  }
  .account-section-link {
    display: inline-block;
    margin-top: 24px;
    font-size: 14px;
  }
  @media (max-width: 1023px) {
    .account-section-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 600px) {
    .account-section-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
