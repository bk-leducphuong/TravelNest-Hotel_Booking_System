<template>
  <el-dialog
    :model-value="true"
    :title="dialogTitle"
    width="480px"
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @close="$emit('cancel')"
    ><p>{{ message }}</p>
    <template #footer
      ><button
        type="button"
        class="guest-button guest-button-secondary"
        :disabled="busy"
        @click="$emit('cancel')"
      >
        {{ $t('account.common.cancel') }}</button
      ><button
        type="button"
        class="guest-button danger-button"
        :disabled="busy"
        @click="$emit('confirm')"
      >
        {{ busy ? $t('account.common.removing') : dialogConfirmLabel }}
      </button></template
    ></el-dialog
  >
</template>
<script>
  export default {
    name: 'ConfirmDialog',
    props: {
      title: {
        type: String,
        default: '',
      },
      message: {
        type: String,
        default: '',
      },
      confirmLabel: {
        type: String,
        default: '',
      },
      busy: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['cancel', 'confirm'],
    computed: {
      dialogTitle() {
        return this.title || this.$t('account.common.areYouSure');
      },
      dialogConfirmLabel() {
        return this.confirmLabel || this.$t('account.common.confirm');
      },
    },
  };
</script>
<style scoped>
  .danger-button {
    background: #b3261e;
    border-color: #b3261e;
    margin-left: 12px;
  }
</style>
