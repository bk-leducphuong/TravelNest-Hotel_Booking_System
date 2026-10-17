<script setup></script>

<template>
  <div class="footer">
    <div class="footer-content">
      <div class="footer-column">
        <h3>{{ $t('footer.support') }}</h3>
        <ul>
          <li><a>{{ $t('footer.covidFaqs') }}</a></li>
          <li><a>{{ $t('footer.manageTrips') }}</a></li>
          <li><a>{{ $t('footer.contactService') }}</a></li>
          <li><a>{{ $t('footer.safetyCentre') }}</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>{{ $t('footer.discover') }}</h3>
        <ul>
          <li><a>{{ $t('footer.geniusLoyalty') }}</a></li>
          <li><a>{{ $t('footer.seasonalDeals') }}</a></li>
          <li><a>{{ $t('footer.travelArticles') }}</a></li>
          <li><a>{{ $t('footer.forBusiness') }}</a></li>
          <li><a>{{ $t('footer.reviewAwards') }}</a></li>
          <li><a>{{ $t('footer.carHire') }}</a></li>
          <li><a>{{ $t('footer.flightFinder') }}</a></li>
          <li><a>{{ $t('footer.restaurantReservations') }}</a></li>
          <li><a>{{ $t('footer.forTravelAgents') }}</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>{{ $t('footer.termsAndSettings') }}</h3>
        <ul>
          <li><a>{{ $t('footer.privacyCookies') }}</a></li>
          <li><a>{{ $t('footer.termsConditions') }}</a></li>
          <li><a>{{ $t('footer.partnerDispute') }}</a></li>
          <li><a>{{ $t('footer.modernSlavery') }}</a></li>
          <li><a>{{ $t('footer.humanRights') }}</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>{{ $t('footer.partners') }}</h3>
        <ul>
          <li><a>{{ $t('footer.extranetLogin') }}</a></li>
          <li><a>{{ $t('footer.partnerHelp') }}</a></li>
          <li><a>{{ $t('footer.listProperty') }}</a></li>
          <li><a>{{ $t('footer.becomeAffiliate') }}</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>{{ $t('footer.about') }}</h3>
        <ul>
          <li><a>{{ $t('footer.aboutBooking') }}</a></li>
          <li><a>{{ $t('footer.howWeWork') }}</a></li>
          <li><a>{{ $t('footer.sustainability') }}</a></li>
          <li><a>{{ $t('footer.pressCentre') }}</a></li>
          <li><a>{{ $t('footer.careers') }}</a></li>
          <li><a>{{ $t('footer.investorRelations') }}</a></li>
          <li><a>{{ $t('footer.corporateContact') }}</a></li>
        </ul>
      </div>
    </div>
    <div class="language-selector">
      <span>
        <button>USD</button>
      </span>
    </div>
    <div class="footer-bottom">
      <p>
        {{ $t('footer.disclaimer') }}
      </p>
      <p>{{ $t('footer.copyright') }}</p>
    </div>
    <div class="brand-logos">
      <span class="brand-name">TravelNest</span>
      <span class="brand-name">Priceline</span>
      <span class="brand-name">Kayak</span>
      <span class="brand-name">Agoda</span>
      <span class="brand-name">OpenTable</span>
    </div>
  </div>
</template>

<style scoped>
.footer {
  background-color: #e3e3e3;
  padding: 20px;
  font-size: 14px;
  /* Push the footer to the bottom of the page when content is short
     (the app root is a full-height flex column). */
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

.footer-column {
  flex: 1;
  margin-right: 20px;
}

.footer-column h3 {
  font-size: 16px;
  margin-bottom: 10px;
}

.footer-column ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.footer-column li {
  margin-bottom: 5px;
}

.footer-column a {
  color: #0071c2;
  text-decoration: none;
}

.footer-column a:hover {
  text-decoration: underline;
}

.footer-bottom {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.language-selector {
  display: flex;
  align-items: center;
  margin-top: 20px;
}

.language-selector img {
  width: 20px;
  margin-right: 5px;
}

.brand-logos {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.brand-logos img {
  height: 20px;
  margin: 0 10px;
}

.brand-name {
  margin: 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}
</style>
