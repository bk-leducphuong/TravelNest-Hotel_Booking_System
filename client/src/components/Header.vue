<script>
  import { mapGetters } from 'vuex';
  import AccountMenu from './user/AccountMenu.vue';
  import BaseHeader from './common/BaseHeader.vue';
  import Notification from './Notification.vue';
  import SearchBar from './SearchBar.vue';
  export default {
    name: 'GuestHeader',
    components: { AccountMenu, BaseHeader, Notification, SearchBar },
    props: { isSearchOpen: { type: Boolean, required: true } },
    computed: { ...mapGetters('auth', ['isUserAuthenticated']) },
  };
</script>
<template>
  <BaseHeader
    ><template #nav-items>
      <Notification v-if="isUserAuthenticated" />
      <li class="guest-host-link">
        <RouterLink to="/join">{{ $t('userHeader.postProperty') }}</RouterLink>
      </li>
      <li v-if="!isUserAuthenticated" class="guest-register">
        <RouterLink to="/login?action=register">{{ $t('userHeader.register') }}</RouterLink>
      </li>
      <li v-if="!isUserAuthenticated">
        <RouterLink to="/login" class="guest-button guest-button-small">{{
          $t('userHeader.login')
        }}</RouterLink>
      </li>
      <li v-else><AccountMenu /></li> </template
  ></BaseHeader>
  <SearchBar :is-search-open="isSearchOpen" />
</template>
