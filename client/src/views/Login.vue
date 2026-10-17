<template>
  <LoginHeader :isAdminLogin="false" />
  <div class="container">
    <h1>{{ heading }}</h1>
    <p>{{ description }}</p>

    <div v-if="isVerificationRequired" class="verification-card">
      <h2>{{ $t('authPage.verifyEmailTitle') }}</h2>
      <p>
        {{ $t('authPage.verifyEmailMessage') }}
      </p>
      <div class="actions">
        <button type="button" class="btn" @click="retryBootstrap">
          {{ $t('authPage.verifiedEmailButton') }}
        </button>
        <button type="button" class="btn btn-secondary" @click="startAuthFlow">
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
        <button type="button" class="btn" @click="signOut">
          {{ $t('authPage.signOutAndSwitch') }}
        </button>
      </div>
    </div>

    <div v-else class="actions">
      <button type="button" class="btn" @click="startAuthFlow">
        {{ $t('authPage.continueWithKeycloak') }}
      </button>
      <button type="button" class="btn btn-secondary" @click="startResetPassword">
        {{ $t('authPage.forgotPassword') }}
      </button>
    </div>

    <p class="hint">
      {{ $t('authPage.browserRedirectHint') }}
    </p>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import {
    isAuthenticated as isKeycloakAuthenticated,
    logout as keycloakLogout,
  } from '@/services/keycloak.service';
  import LoginHeader from '@/components/LoginHeader.vue';
  import { adminAppUrl } from '@/utils/adminApp';

  export default {
    components: {
      LoginHeader,
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

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .container {
    max-width: 560px;
    margin: $spacing-xxl auto;
    padding: $spacing-xl;
    background-color: $white;
    border-radius: $border-radius-sm;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  }

  h1 {
    color: $text-primary;
    margin-bottom: $spacing-md;
  }

  p {
    color: $text-secondary;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin: $spacing-lg 0;
  }

  .btn {
    @include button-primary;
  }

  .btn-secondary {
    color: $text-primary;
    background-color: transparent;
    border: 1px solid $border-color;
  }

  .verification-card {
    margin: $spacing-lg 0;
    padding: $spacing-lg;
    background: rgba($primary-color, 0.06);
    border: 1px solid rgba($primary-color, 0.2);
    border-radius: $border-radius-sm;
  }

  .verification-card h2 {
    margin-bottom: $spacing-sm;
    color: $text-primary;
    font-size: 20px;
  }

  .hint {
    font-size: 14px;
  }
</style>
