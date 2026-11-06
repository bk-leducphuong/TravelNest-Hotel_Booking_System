<script>
  export default {
    name: 'BaseHeader',
    props: {
      useContainer: { type: Boolean, default: true },
      headerClass: { type: String, default: 'header' },
    },
    methods: {
      changeLanguage(event) {
        const language = event.target.value;
        localStorage.setItem('language', language);
        this.$i18n.locale = language;
        this.$store.dispatch('user/updateUserLanguage', language);
      },
    },
  };
</script>
<template>
  <header class="guest-header" :class="headerClass">
    <a class="guest-skip" href="#guest-main">{{ $t('guest.skip') }}</a>
    <div class="guest-header-inner">
      <RouterLink to="/" class="guest-brand" aria-label="TravelNest"
        ><span class="guest-mark" aria-hidden="true">TN</span><span>TravelNest</span></RouterLink
      >
      <nav :aria-label="$t('guest.navigation')" class="guest-header-nav">
        <ul>
          <li>
            <select
              class="guest-language"
              :value="$i18n.locale"
              :aria-label="$t('language.selectTitle')"
              @change="changeLanguage"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </li>
          <slot name="nav-items" />
        </ul>
      </nav>
    </div>
  </header>
</template>
