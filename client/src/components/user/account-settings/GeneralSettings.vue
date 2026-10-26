<script>
  export default {
    methods: {
      changeLanguage(event) {
        const language = event.target.value;
        this.$i18n.locale = language;
        localStorage.setItem('language', language);
        this.$store.dispatch('user/updateUserLanguage', language);
      },
    },
  };
</script>
<template>
  <section class="general-settings">
    <header class="guest-section">
      <h1 class="guest-page-title">{{ $t('account.general.title') }}</h1>
      <p class="guest-subtitle">{{ $t('account.general.description') }}</p>
    </header>
    <article class="guest-section">
      <h2>{{ $t('account.general.language') }}</h2>
      <p class="guest-subtitle">{{ $t('account.general.languageDescription') }}</p>
      <label
        >{{ $t('language.selectTitle')
        }}<select class="guest-select" :value="$i18n.locale" @change="changeLanguage">
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select></label
      >
    </article>
    <article class="guest-section">
      <h2>{{ $t('account.general.currency') }}</h2>
      <p class="guest-subtitle">{{ $t('account.general.currencyDescription') }}</p>
    </article>
  </section>
</template>
<style scoped>
  .general-settings {
    display: grid;
    gap: 16px;
  }
  .guest-page-title {
    font-size: 24px;
    line-height: 1.3;
  }
  h2 {
    font-size: 16px;
    line-height: 1.4;
    font-weight: 600;
  }
  label {
    display: block;
    margin-top: 20px;
    font-size: 13px;
  }
</style>
