<template>
  <LoginHeader :isAdminLogin="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <section class="guest-section auth-card">
      <h1>{{ heading }}</h1>
      <p>{{ description }}</p>

      <div v-if="isVerificationRequired" class="verification-card">
        <h2>{{ $t('authPage.verifyEmailTitle') }}</h2>
        <p>
          {{ $t('authPage.verifyEmailMessage') }}
        </p>
        <div class="actions">
          <button type="button" class="guest-button" @click="retryBootstrap">
            {{ $t('authPage.verifiedEmailButton') }}
          </button>
          <button type="button" class="guest-button guest-button-secondary" @click="startAuthFlow">
            {{ $t('authPage.continueWithKeycloak') }}
          </button>
        </div>
      </div>

      <div v-else-if="sessionRejected" class="verification-card">
        <h2>{{ $t('authPage.accountUnavailableTitle') }}</h2>
        <p>
          {{ $t('authPage.accountUnavailableMessage') }}
        </p>
        <div class="actions">
          <button type="button" class="guest-button" @click="signOut">
            {{ $t('authPage.signOutAndSwitch') }}
          </button>
        </div>
      </div>

      <div v-else class="actions">
        <button type="button" class="guest-button" @click="startAuthFlow">
          {{ $t('authPage.continueWithKeycloak') }}
        </button>
        <button
          type="button"
          class="guest-button guest-button-secondary"
          @click="startResetPassword"
        >
          {{ $t('authPage.forgotPassword') }}
        </button>
      </div>

      <p class="hint">
        {{ $t('authPage.browserRedirectHint') }}
      </p>
    </section>
  </main>
  <TheFooter />
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import {
    isAuthenticated as isKeycloakAuthenticated,
    logout as keycloakLogout,
  } from '@/services/keycloak.service';
  import TheFooter from '@/components/Footer.vue';
  import LoginHeader from '@/components/LoginHeader.vue';
  import { adminAppUrl } from '@/utils/adminApp';

  export default {
    components: {
      LoginHeader,
      TheFooter,
    },
    setup() {
      const toast = useToast();
      return { toast };
    },
    data() {
      return {
        authStarted: false,
        sessionRejected: false,
      };
    },
    computed: {
      ...mapGetters('auth', [
        'isUserAuthenticated',
        'isAdminAuthenticated',
        'isVerificationRequired',
      ]),
      requestedAction() {
        return this.$route.query.action === 'register' ? 'register' : 'login';
      },
      heading() {
        return this.requestedAction === 'register'
          ? this.$t('authPage.redirectingToRegister')
          : this.$t('authPage.redirectingToLogin');
      },
      description() {
        return this.requestedAction === 'register'
          ? this.$t('authPage.descriptionRegister')
          : this.$t('authPage.descriptionLogin');
      },
    },
    methods: {
      ...mapActions('auth', ['login', 'register', 'resetPassword', 'checkAuth']),
      redirectAuthenticatedUser() {
        if (this.isAdminAuthenticated) {
          window.location.replace(this.$route.query.redirect || adminAppUrl('/'));
          return;
        }

        if (this.isUserAuthenticated) {
          this.$router.replace(this.$route.query.redirect || '/');
        }
      },
      async startAuthFlow() {
        if (this.authStarted) {
          return;
        }

        this.authStarted = true;

        try {
          if (this.requestedAction === 'register') {
            await this.register({ redirectRoute: this.$route.query.redirect || '/' });
            return;
          }

          await this.login({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.authStarted = false;
          this.toast.error(error.message || this.$t('authPage.errors.redirectFailed'));
        }
      },
      async startResetPassword() {
        try {
          await this.resetPassword({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.toast.error(error.message || this.$t('authPage.errors.resetPasswordFailed'));
        }
      },
      async retryBootstrap() {
        try {
          await this.checkAuth();
          this.redirectAuthenticatedUser();
        } catch (error) {
          this.toast.error(error.message || this.$t('authPage.errors.emailNotVerified'));
        }
      },
      async signOut() {
        await keycloakLogout();
      },
    },
    mounted() {
      this.redirectAuthenticatedUser();

      // Keycloak still holds a session but the app session could not be
      // established (e.g. the account was deleted or disabled). Restarting the
      // Keycloak flow would immediately return with the same session and land
      // back here — an endless reload. Require an explicit action instead.
      this.sessionRejected = isKeycloakAuthenticated() && !this.isUserAuthenticated;

      if (
        !this.sessionRejected &&
        !this.isUserAuthenticated &&
        !this.isAdminAuthenticated &&
        !this.isVerificationRequired
      ) {
        this.startAuthFlow();
      }
    },
    watch: {
      isUserAuthenticated() {
        this.redirectAuthenticatedUser();
      },
      isAdminAuthenticated() {
        this.redirectAuthenticatedUser();
      },
      '$route.query.action'() {
        this.authStarted = false;
        this.startAuthFlow();
      },
    },
  };
</script>

<style scoped>
  .auth-card {
    max-width: 640px;
    margin: 24px auto;
  }
  .auth-card h1 {
    font-size: 28px;
    font-weight: 500;
    color: var(--tn-brand);
  }
  .auth-card p {
    color: var(--tn-muted);
    font-size: 14px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 24px 0;
  }
  .verification-card {
    background: var(--tn-soft);
    border-radius: 14px;
    padding: 20px;
    margin-top: 24px;
  }
  .verification-card h2 {
    font-size: 20px;
  }
  .hint {
    margin-top: 24px;
  }
</style>
