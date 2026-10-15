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
      <li v-if="isAdminLogin"><span>{{ $t('joinHeader.partnerQuestion') }}</span></li>
      <li v-if="isAdminLogin" class="login" v-on:click="goToAdminApp('/login')">
        {{ $t('joinHeader.login') }}
      </li>
      <li class="guides">{{ $t('joinHeader.help') }}</li>
    </template>
  </BaseHeader>
</template>
