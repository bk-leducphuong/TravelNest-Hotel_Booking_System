<script>
  import BaseHeader from './common/BaseHeader.vue';
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
  };
</script>
<template>
  <BaseHeader :use-container="false" header-class="header-container">
    <template #nav-items>
      <li v-if="isAdminLogin"><span>Đã là đối tác ?</span></li>
      <li v-if="isAdminLogin" class="login" @click="$router.push('/admin/login')">
        Đăng nhập
      </li>
      <li class="guides">Trợ giúp</li>
    </template>
  </BaseHeader>
</template>
