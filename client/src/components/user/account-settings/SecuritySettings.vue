<script>
export default {
  computed: {
    // Passwords are managed by Keycloak; link to its account console.
    accountManagementUrl() {
      const url = import.meta.env.VITE_KEYCLOAK_URL
      const realm = import.meta.env.VITE_KEYCLOAK_REALM
      return url && realm ? `${url}/realms/${realm}/account` : '#'
    },
  },
  data() {
    return {
      unsupportedActions: [
        {
          title: 'Two-factor authentication',
          description: 'Additional sign-in factors are not exposed by the current account API.',
        },
        {
          title: 'Active sessions',
          description: 'Remote session management is still being moved onto the new backend surface.',
        },
        {
          title: 'Delete account',
          description: 'Account deletion is not wired to a supported self-service endpoint yet.',
        },
      ],
    }
  },
}
</script>

<template>
  <section class="settings-panel">
    <header class="panel-header">
      <h1>Security settings</h1>
      <p>Manage your password in the secure account portal. Other security controls remain visible but unavailable.</p>
    </header>

    <article class="detail-card">
      <div class="detail-header">
        <div>
          <h2>Password</h2>
          <p>Your password is managed by your TravelNest account provider (Keycloak).</p>
        </div>
        <a
          class="secondary-button"
          :href="accountManagementUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage password
        </a>
      </div>

      <div class="value-row">
        Use the secure account portal to change your password and review sign-in security.
      </div>
    </article>

    <article v-for="action in unsupportedActions" :key="action.title" class="detail-card muted-card">
      <div class="detail-header">
        <div>
          <h2>{{ action.title }}</h2>
          <p>{{ action.description }}</p>
        </div>
        <button type="button" class="disabled-button" disabled>Unavailable</button>
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
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #fff;
}

.panel-header h1,
.detail-card h2 {
  margin: 0 0 8px;
  color: #0f172a;
}

.panel-header h1 {
  font-size: 30px;
}

.panel-header p,
.detail-card p,
.value-row {
  margin: 0;
  color: #475569;
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
  border-radius: 8px;
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
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.primary-button {
  padding: 11px 16px;
  border: none;
  background: #2563eb;
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
  color: #0f172a;
  cursor: pointer;
}

.disabled-button {
  padding: 11px 16px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #94a3b8;
}

.muted-card {
  background: #f8fafc;
}

code {
  padding: 2px 6px;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
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
