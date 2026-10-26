<script>
  import TheFooter from '@/components/Footer.vue';
  import LoginHeader from '@/components/LoginHeader.vue';
  import { adminAppUrl } from '@/utils/adminApp';
  export default {
    components: {
      LoginHeader,
      TheFooter,
    },
    methods: {
      adminAppUrl,
      goToWizard() {
        this.$router.push('/join/become-a-host');
      },
    },
  };
</script>

<template>
  <div class="join-container">
    <LoginHeader :isAdminLogin="true" />
    <main id="guest-main" tabindex="-1" class="guest-page main-container">
      <div class="left-main-container">
        <h1 class="main-title">
          {{ $t('join.titleLine1') }}<br />
          <span class="highlight">{{ $t('join.titleHighlight') }}</span
          ><br />
          {{ $t('join.titleLine2') }}
        </h1>
        <p class="subtitle">
          {{ $t('join.subtitle') }}
        </p>
      </div>
      <div class="register-card">
        <h2 class="register-title">{{ $t('join.registerTitle') }}</h2>
        <ul class="list">
          <li>{{ $t('join.benefit1') }}</li>
          <li>{{ $t('join.benefit2') }}</li>
          <li>{{ $t('join.benefit3') }}</li>
        </ul>
        <button class="get-started-button" @click="goToWizard">
          {{ $t('join.getStarted') }}
        </button>
        <div class="login-text">
          {{ $t('join.alreadyStarted') }}
          <div>
            <a class="login-link" :href="adminAppUrl('/login')">
              {{ $t('join.continueRegistration') }}
            </a>
          </div>
        </div>
      </div>
    </main>
    <TheFooter />
  </div>
</template>

<style scoped>
  .join-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .main-container {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 48px;
    align-items: center;
    padding-top: 64px;
    padding-bottom: 64px;
  }
  .main-title {
    font-size: clamp(32px, 4vw, 48px);
    font-weight: 500;
    line-height: 1.25;
    color: var(--tn-brand);
  }
  .subtitle {
    color: var(--tn-muted);
    font-size: 18px;
    margin-top: 24px;
  }
  .register-card {
    background: white;
    border-radius: 20px;
    padding: 32px;
  }
  .register-title {
    font-size: 24px;
    font-weight: 500;
  }
  .list {
    padding-left: 20px;
    line-height: 2;
    font-size: 14px;
    margin: 24px 0;
  }
  .get-started-button {
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    background: var(--tn-action);
    color: white;
    padding: 12px 20px;
    cursor: pointer;
  }
  .login-text {
    font-size: 14px;
    margin-top: 24px;
  }
  .login-link {
    display: inline-block;
    margin-top: 8px;
  }
  @media (max-width: 767px) {
    .main-container {
      grid-template-columns: minmax(0, 1fr);
      gap: 32px;
      padding-top: 32px;
      padding-bottom: 32px;
    }
    .register-card {
      padding: 24px;
    }
  }
</style>
