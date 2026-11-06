<script>
  import { mapGetters } from 'vuex';

  export default {
    computed: {
      ...mapGetters('user', ['getUserInformation']),
    },
  };
</script>

<template>
  <section class="settings-panel">
    <header class="panel-header">
      <h1>{{ $t('account.email.title') }}</h1>
      <p>
        {{ $t('account.email.description') }}
      </p>
    </header>

    <article class="detail-card">
      <div class="detail-row">
        <div>
          <h2>{{ $t('account.email.accountEmail') }}</h2>
          <p>
            {{ getUserInformation?.email || $t('account.email.noEmailLoaded') }}
          </p>
        </div>
        <button type="button" class="disabled-button" disabled>
          {{ $t('account.status.comingSoon') }}
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
  .detail-card p {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.6;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .disabled-button {
    padding: 11px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    background: var(--tn-canvas);
    color: #94a3b8;
    font-size: 14px;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .panel-header,
    .detail-card {
      padding: 20px;
    }

    .detail-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
