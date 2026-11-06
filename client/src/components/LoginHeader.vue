<script>
  import BaseHeader from './common/BaseHeader.vue';
  import { goToAdminApp } from '@/utils/adminApp';
  export default {
    components: {
      BaseHeader,
    },
    props: {
      isAdminLogin: {
        type: Boolean,
        required: true,
      },
    },
    methods: {
      goToAdminApp,
    },
  };
</script>
<template>
  <BaseHeader :use-container="false" header-class="header-container">
    <template #nav-items>
      <li v-if="isAdminLogin">
        <span>{{ $t('joinHeader.partnerQuestion') }}</span>
      </li>
      <li v-if="isAdminLogin">
        <button
          type="button"
          class="guest-button guest-button-small"
          @click="goToAdminApp('/login')"
        >
          {{ $t('joinHeader.login') }}
        </button>
      </li>
    </template>
  </BaseHeader>
</template>
