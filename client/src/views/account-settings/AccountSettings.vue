<script>
  import TheHeader from '@/components/Header.vue';
  import { accountSettingsSections } from './sections';

  export default {
    components: {
      TheHeader,
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
  <TheHeader :isSearchOpen="false" />
  <main class="account-settings-home">
    <section class="hero">
      <p class="eyebrow">Account settings</p>
      <h1>Manage your account</h1>
      <p class="hero-copy">
        Use the new settings area to update supported profile and security details without relying
        on legacy account endpoints.
      </p>
    </section>

    <section class="section-grid">
      <article
        v-for="section in sections"
        :key="section.slug"
        class="section-card"
        :class="{ 'section-card-disabled': !section.available }"
        @click="openSection(section.slug)"
      >
        <div class="section-card-header">
          <h2>{{ section.title }}</h2>
          <span class="status-pill" :class="{ 'status-pill-muted': !section.available }">
            {{ section.available ? 'Available' : 'Coming soon' }}
          </span>
        </div>
        <p>{{ section.summary }}</p>
        <button type="button" class="section-link">
          {{ section.cta }}
        </button>
      </article>
    </section>
  </main>
</template>

<style scoped>
  .account-settings-home {
    max-width: 1120px;
    margin: 0 auto;
    padding: 40px 24px 56px;
  }

  .hero {
    margin-bottom: 32px;
  }

  .eyebrow {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
  }

  .hero h1 {
    margin: 0 0 12px;
    font-size: 34px;
    color: #0f172a;
  }

  .hero-copy {
    max-width: 640px;
    margin: 0;
    color: #475569;
    line-height: 1.6;
  }

  .section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .section-card {
    min-height: 220px;
    padding: 24px;
    border: 1px solid #dbe3f0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .section-card:hover {
    border-color: #2563eb;
    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.08);
    transform: translateY(-1px);
  }

  .section-card-disabled {
    background: #f8fafc;
  }

  .section-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-card-header h2 {
    margin: 0;
    font-size: 21px;
    color: #0f172a;
  }

  .section-card p {
    margin: 0 0 20px;
    color: #475569;
    line-height: 1.6;
  }

  .status-pill {
    flex-shrink: 0;
    padding: 6px 10px;
    border-radius: 999px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 600;
  }

  .status-pill-muted {
    background: #e2e8f0;
    color: #475569;
  }

  .section-link {
    padding: 0;
    border: none;
    background: transparent;
    color: #2563eb;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .account-settings-home {
      padding: 24px 16px 40px;
    }

    .hero h1 {
      font-size: 28px;
    }
  }
</style>
