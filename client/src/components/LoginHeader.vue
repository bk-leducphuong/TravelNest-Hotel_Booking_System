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
      <li v-if="isAdminLogin"><span>Đã là đối tác ?</span></li>
      <li v-if="isAdminLogin" class="login" v-on:click="goToAdminApp('/login')">
        Đăng nhập
      </li>
      <li class="guides">Trợ giúp</li>
    </template>
  </BaseHeader>
</template>
