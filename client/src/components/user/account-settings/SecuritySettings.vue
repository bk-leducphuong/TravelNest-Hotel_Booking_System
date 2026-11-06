<script>
  export default {
    computed: {
      // Passwords are managed by Keycloak; link to its account console.
      accountManagementUrl() {
        const url = import.meta.env.VITE_KEYCLOAK_URL;
        const realm = import.meta.env.VITE_KEYCLOAK_REALM;
        return url && realm ? `${url}/realms/${realm}/account` : '';
      },
    },
    data() {
      return {
        unsupportedActions: [
          {
            titleKey: 'account.security.twoFactor.title',
            descriptionKey: 'account.security.twoFactor.description',
          },
          {
            titleKey: 'account.security.activeSessions.title',
            descriptionKey: 'account.security.activeSessions.description',
          },
          {
            titleKey: 'account.security.deleteAccount.title',
            descriptionKey: 'account.security.deleteAccount.description',
          },
        ],
      };
    },
  };
</script>

<template>
  <section class="settings-panel">
    <header class="panel-header">
      <h1>{{ $t('account.security.title') }}</h1>
      <p>{{ $t('account.security.description') }}</p>
    </header>

    <article class="detail-card">
      <div class="detail-header">
        <div>
          <h2>{{ $t('account.security.password.title') }}</h2>
          <p>{{ $t('account.security.password.description') }}</p>
        </div>
        <a
          v-if="accountManagementUrl"
          class="secondary-button"
          :href="accountManagementUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ $t('account.security.password.manage') }}
        </a>
        <p v-else role="status">{{ $t('guest.securityUnavailable') }}</p>
      </div>

      <div class="value-row">
        {{ $t('account.security.password.hint') }}
      </div>
    </article>

    <article
      v-for="action in unsupportedActions"
      :key="action.titleKey"
      class="detail-card muted-card"
    >
      <div class="detail-header">
        <div>
          <h2>{{ $t(action.titleKey) }}</h2>
          <p>{{ $t(action.descriptionKey) }}</p>
        </div>
        <button type="button" class="disabled-button" disabled>
          {{ $t('account.status.unavailable') }}
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header,
  .detail-card {
    padding: 24px 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
  }

  .panel-header h1,
  .detail-card h2 {
    margin: 0 0 8px;
    color: var(--tn-ink);
  }

  .panel-header h1 {
    font-size: 24px;
    line-height: 1.3;
  }

  .detail-card h2 {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .panel-header p,
  .detail-card p,
  .value-row {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.6;
  }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .editor-grid {
    display: grid;
    gap: 16px;
    margin-top: 16px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }

  .field input {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    font-size: 14px;
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .primary-button,
  .secondary-button,
  .disabled-button {
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }

  .primary-button {
    padding: 11px 16px;
    border: none;
    background: var(--tn-action);
    color: #fff;
    cursor: pointer;
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .secondary-button {
    padding: 11px 16px;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: var(--tn-ink);
    cursor: pointer;
  }

  .disabled-button {
    padding: 11px 16px;
    border: 1px solid #cbd5e1;
    background: var(--tn-canvas);
    color: #94a3b8;
  }

  .muted-card {
    background: var(--tn-canvas);
  }

  code {
    padding: 2px 6px;
    border-radius: 10px;
    background: var(--tn-soft);
    color: var(--tn-hover);
  }

  @media (max-width: 768px) {
    .panel-header,
    .detail-card {
      padding: 20px;
    }

    .detail-header,
    .editor-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
