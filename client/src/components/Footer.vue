<template>
  <footer class="guest-footer">
    <div class="guest-footer-inner">
      <RouterLink class="guest-brand" to="/">Trestay</RouterLink>
      <nav :aria-label="$t('guest.footerNavigation')">
        <RouterLink to="/bookings">{{ $t('account.menu.bookings') }}</RouterLink
        ><RouterLink to="/saved-hotels">{{ $t('account.menu.saved') }}</RouterLink
        ><RouterLink to="/flights">{{ $t('footer.flightFinder') }}</RouterLink
        ><RouterLink to="/transfers">{{ $t('footer.airportTransfers') }}</RouterLink
        ><RouterLink to="/account-settings">{{ $t('account.menu.manageAccount') }}</RouterLink
        ><RouterLink to="/join">{{ $t('userHeader.postProperty') }}</RouterLink
        ><RouterLink to="/about">{{ $t('about.link') }}</RouterLink>
      </nav>
      <p>© {{ new Date().getFullYear() }} Trestay · {{ $t('guest.footerTagline') }}</p>
      <p class="guest-footer-legal">{{ $t('footer.disclaimer') }}</p>
    </div>
  </footer>
</template>
