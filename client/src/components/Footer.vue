<template>
  <footer class="guest-footer">
    <div class="guest-footer-inner">
      <RouterLink class="guest-brand" to="/">TravelNest</RouterLink>
      <nav :aria-label="$t('guest.footerNavigation')">
        <RouterLink to="/bookings">{{ $t('account.menu.bookings') }}</RouterLink
        ><RouterLink to="/saved-hotels">{{ $t('account.menu.saved') }}</RouterLink
        ><RouterLink to="/account-settings">{{ $t('account.menu.manageAccount') }}</RouterLink
        ><RouterLink to="/join">{{ $t('userHeader.postProperty') }}</RouterLink>
      </nav>
      <p>© {{ new Date().getFullYear() }} TravelNest · {{ $t('guest.footerTagline') }}</p>
    </div>
  </footer>
</template>
