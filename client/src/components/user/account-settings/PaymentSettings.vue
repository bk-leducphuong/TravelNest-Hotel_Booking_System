<template>
  <section class="settings-panel">
    <header class="panel-header">
      <h1>Payment methods</h1>
      <p>
        Card and wallet management remain visible here, but payment-method editing is not connected
        to a current user settings API.
      </p>
    </header>

    <article class="detail-card muted-card">
      <div class="detail-row">
        <div>
          <h2>Saved payment methods</h2>
          <p>Add, remove, and reorder payment methods once the backend support is available.</p>
        </div>
        <button type="button" class="disabled-button" disabled>Coming soon</button>
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
.detail-card p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.muted-card {
  background: #f8fafc;
}

.disabled-button {
  padding: 11px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
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
