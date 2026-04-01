<template>
  <BaseHeader>
    <template #nav-items>
      <Notification />
      <li>
        <span
          ><a @click="$router.push('/join')">{{ $t('userHeader.postProperty') }}</a></span
        >
      </li>
      <li v-if="!isUserAuthenticated">
        <a class="login" style="margin-right: 5px" @click="$router.push('/login')">Đăng ký</a>
        <a class="login" style="margin-left: 5px" @click="$router.push('/login')">Đăng nhập</a>
      </li>
      <li v-if="isUserAuthenticated">
        <AccountMenu />
      </li>
    </template>
  </BaseHeader>

  <SearchBar :is-search-open="isSearchOpen" />
</template>

<script>
  import { mapGetters } from 'vuex';
  import AccountMenu from './user/AccountMenu.vue';
  import BaseHeader from './common/BaseHeader.vue';
  import Notification from './Notification.vue';
  import SearchBar from './SearchBar.vue';

  export default {
    components: {
      AccountMenu,
      BaseHeader,
      Notification,
      SearchBar,
    },
    props: {
      isSearchOpen: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .login {
    padding: 5px 10px;
    color: #1d5fc2;
    font-weight: 500;
    background-color: #fff;
    border-radius: 5px;
  }
</style>
