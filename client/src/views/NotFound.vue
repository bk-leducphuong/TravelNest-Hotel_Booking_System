<script setup>
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
</script>
<template>
  <Header :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page not-found-page">
    <section class="guest-section">
      <p class="guest-subtitle">404</p>
      <h1 class="guest-page-title">{{ $t('misc.notFound.title') }}</h1>
      <p>{{ $t('misc.notFound.message') }}</p>
      <RouterLink class="guest-button" to="/">{{ $t('misc.notFound.goHome') }}</RouterLink>
    </section>
  </main>
  <Footer />
</template>
<style scoped>
  .not-found-page {
    max-width: 700px;
    text-align: center;
    padding-top: 64px;
    padding-bottom: 64px;
  }
  .not-found-page p {
    margin: 20px 0;
  }
</style>
