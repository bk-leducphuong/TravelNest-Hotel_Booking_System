<script>
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
  import FeedbackMessage from '@/components/common/FeedbackMessage.vue';
  import PartnersService from '@/services/partners.service';
  import { openPartnerUrl } from '@/utils/partnerLink';

  const today = new Date().toISOString().slice(0, 10);

  export default {
    name: 'FlightsView',
    components: { Header, Footer, FeedbackMessage },
    data() {
      return {
        today,
        form: {
          origin: '',
          destination: '',
          departDate: '',
          returnDate: '',
          adults: 1,
          children: 0,
          cabinClass: 'economy',
        },
        cabinClasses: ['economy', 'premium_economy', 'business', 'first'],
        loading: false,
        error: '',
        link: null,
        popupBlocked: false,
      };
    },
    computed: {
      disclosure() {
        return this.link?.provider
          ? this.$t('partners.disclosureNamed', { provider: this.link.provider })
          : this.$t('partners.disclosure');
      },
    },
    methods: {
      async submit() {
        this.loading = true;
        this.error = '';
        this.link = null;
        this.popupBlocked = false;

        try {
          const response = await PartnersService.getLink('flights', this.form);
          this.link = response?.data || null;

          if (this.link?.url) {
            // Opening after the request loses the click gesture, so the result
            // panel below always offers a tappable link as a fallback.
            this.popupBlocked = !openPartnerUrl(this.link.url);
          }
        } catch (err) {
          const code = err?.response?.data?.error?.code;
          this.error =
            code === 'PARTNER_NOT_CONFIGURED'
              ? this.$t('partners.unavailable')
              : this.$t('partners.error');
        } finally {
          this.loading = false;
        }
      },
    },
  };
</script>

<template>
  <Header :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page partner-page">
    <section class="guest-section">
      <p class="guest-subtitle">{{ $t('partners.outbound') }}</p>
      <h1 class="guest-page-title">{{ $t('partners.flights.title') }}</h1>
      <p class="partner-intro">{{ $t('partners.flights.subtitle') }}</p>

      <form class="guest-form partner-form" @submit.prevent="submit">
        <label>
          {{ $t('partners.origin') }}
          <input
            v-model.trim="form.origin"
            name="origin"
            maxlength="80"
            autocomplete="off"
            required
          />
        </label>
        <label>
          {{ $t('partners.destination') }}
          <input
            v-model.trim="form.destination"
            name="destination"
            maxlength="160"
            autocomplete="off"
            required
          />
        </label>
        <label>
          {{ $t('partners.departDate') }}
          <input v-model="form.departDate" type="date" name="departDate" :min="today" required />
        </label>
        <label>
          {{ $t('partners.returnDate') }}
          <input
            v-model="form.returnDate"
            type="date"
            name="returnDate"
            :min="form.departDate || today"
          />
        </label>
        <label>
          {{ $t('partners.adults') }}
          <input
            v-model.number="form.adults"
            type="number"
            name="adults"
            min="1"
            max="9"
            required
          />
        </label>
        <label>
          {{ $t('partners.children') }}
          <input v-model.number="form.children" type="number" name="children" min="0" max="9" />
        </label>
        <label>
          {{ $t('partners.cabinClass') }}
          <select v-model="form.cabinClass" name="cabinClass">
            <option v-for="cabin in cabinClasses" :key="cabin" :value="cabin">
              {{ $t(`partners.cabin.${cabin}`) }}
            </option>
          </select>
        </label>
        <div class="partner-actions">
          <button class="guest-button" type="submit" :disabled="loading">
            {{ loading ? $t('partners.searching') : $t('partners.search') }}
          </button>
          <span class="partner-hint">{{ $t('partners.newTabHint') }}</span>
        </div>
      </form>

      <FeedbackMessage v-if="error" :message="error" dismissible @dismiss="error = ''" />

      <div v-if="link?.url" class="partner-result">
        <p v-if="popupBlocked" class="partner-hint">{{ $t('partners.popupBlocked') }}</p>
        <a
          class="guest-button"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          {{
            link.provider
              ? $t('partners.openPartner', { provider: link.provider })
              : $t('partners.openPartnerGeneric')
          }}
        </a>
      </div>

      <p class="partner-disclosure">{{ disclosure }}</p>
    </section>
  </main>
  <Footer />
</template>

<style scoped>
  .partner-page {
    max-width: 900px;
  }
  .partner-intro {
    margin-top: 12px;
    color: var(--tn-muted);
  }
  .partner-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .partner-actions {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .partner-hint {
    color: var(--tn-muted);
    font-size: 13px;
  }
  .partner-result {
    margin-top: 24px;
  }
  .partner-disclosure {
    margin-top: 28px;
    color: var(--tn-muted);
    font-size: 13px;
  }
  @media (max-width: 600px) {
    .partner-form {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
