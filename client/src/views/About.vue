<script>
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';

  export default {
    name: 'About',
    components: { TheHeader, TheFooter },
    data() {
      return {
        repositoryUrl: 'https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System',
      };
    },
  };
</script>

<template>
  <div class="about-root">
    <TheHeader />
    <main id="guest-main" tabindex="-1" class="guest-page about-page">
      <header class="about-hero">
        <p class="about-eyebrow">{{ $t('about.eyebrow') }}</p>
        <h1 class="guest-page-title">{{ $t('about.title') }}</h1>
        <p class="guest-subtitle">{{ $t('about.lead') }}</p>
        <div class="about-actions">
          <RouterLink class="guest-button" to="/search">{{ $t('about.ctaSearch') }}</RouterLink>
          <a
            class="guest-button guest-button-secondary"
            :href="repositoryUrl"
            target="_blank"
            rel="noopener noreferrer"
            >{{ $t('about.ctaSource') }}</a
          >
        </div>
      </header>

      <section class="guest-section">
        <h2>{{ $t('about.whatTitle') }}</h2>
        <p>{{ $t('about.whatText') }}</p>
        <ul class="about-list">
          <li>
            <strong>{{ $t('about.guestTitle') }}</strong> {{ $t('about.guestText') }}
          </li>
          <li>
            <strong>{{ $t('about.hostTitle') }}</strong> {{ $t('about.hostText') }}
          </li>
          <li>
            <strong>{{ $t('about.operatorTitle') }}</strong> {{ $t('about.operatorText') }}
          </li>
        </ul>
      </section>

      <section class="guest-section">
        <h2>{{ $t('about.stackTitle') }}</h2>
        <p>{{ $t('about.stackText') }}</p>
        <dl class="about-stack">
          <div>
            <dt>{{ $t('about.stackGuestLabel') }}</dt>
            <dd>{{ $t('about.stackGuest') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackConsoleLabel') }}</dt>
            <dd>{{ $t('about.stackConsole') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackApiLabel') }}</dt>
            <dd>{{ $t('about.stackApi') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackDataLabel') }}</dt>
            <dd>{{ $t('about.stackData') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackJobsLabel') }}</dt>
            <dd>{{ $t('about.stackJobs') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackAuthLabel') }}</dt>
            <dd>{{ $t('about.stackAuth') }}</dd>
          </div>
          <div>
            <dt>{{ $t('about.stackInfraLabel') }}</dt>
            <dd>{{ $t('about.stackInfra') }}</dd>
          </div>
        </dl>
      </section>

      <section class="guest-section">
        <h2>{{ $t('about.whyTitle') }}</h2>
        <p>{{ $t('about.whyText') }}</p>
      </section>

      <p class="about-note">{{ $t('footer.disclaimer') }}</p>
    </main>
    <TheFooter />
  </div>
</template>

<style scoped>
  .about-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .about-page {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 20px 56px;
    width: 100%;
  }

  .about-hero {
    padding: 24px 0 8px;
  }

  .about-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 8px;
  }

  .about-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
  }

  .about-list {
    margin: 12px 0 0;
    padding-left: 20px;
    display: grid;
    gap: 10px;
    line-height: 1.6;
  }

  .about-list strong {
    font-weight: 600;
  }

  .about-stack {
    display: grid;
    gap: 10px;
    margin: 16px 0 0;
  }

  .about-stack div {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e5e7eb;
  }

  .about-stack dt {
    font-weight: 600;
    color: #111827;
  }

  .about-stack dd {
    margin: 0;
    color: #374151;
  }

  .about-note {
    margin-top: 28px;
    font-size: 13px;
    line-height: 1.5;
    color: #6b7280;
  }

  @media (max-width: 640px) {
    .about-stack div {
      grid-template-columns: 1fr;
      gap: 2px;
    }
  }
</style>
