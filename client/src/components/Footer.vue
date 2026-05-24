<script setup></script>

<template>
  <div class="footer">
    <div class="footer-content">
      <div class="footer-column">
        <h3>Support</h3>
        <ul>
          <li><a>Coronavirus (COVID-19) FAQs</a></li>
          <li><a>Manage your trips</a></li>
          <li><a>Contact Customer Service</a></li>
          <li><a>Safety resource centre</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>Discover</h3>
        <ul>
          <li><a>Genius loyalty programme</a></li>
          <li><a>Seasonal and holiday deals</a></li>
          <li><a>Travel articles</a></li>
          <li><a>Booking.com for Business</a></li>
          <li><a>Traveller Review Awards</a></li>
          <li><a>Car hire</a></li>
          <li><a>Flight finder</a></li>
          <li><a>Restaurant reservations</a></li>
          <li><a>Booking.com for Travel Agents</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>Terms and settings</h3>
        <ul>
          <li><a>Privacy & cookies</a></li>
          <li><a>Terms and conditions</a></li>
          <li><a>Partner dispute</a></li>
          <li><a>Modern Slavery Statement</a></li>
          <li><a>Human Rights Statement</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>Partners</h3>
        <ul>
          <li><a>Extranet login</a></li>
          <li><a>Partner help</a></li>
          <li><a>List your property</a></li>
          <li><a>Become an affiliate</a></li>
        </ul>
      </div>
      <div class="footer-column">
        <h3>About</h3>
        <ul>
          <li><a>About Booking.com</a></li>
          <li><a>How we work</a></li>
          <li><a>Sustainability</a></li>
          <li><a>Press centre</a></li>
          <li><a>Careers</a></li>
          <li><a>Investor relations</a></li>
          <li><a>Corporate contact</a></li>
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
        TravelNest is part of Booking Holdings Inc., the world leader in online travel and related
        services.
      </p>
      <p>Copyright © 1996–2024 TravelNest™. All rights reserved.</p>
    </div>
    <div class="brand-logos">
      <img src="" alt="TravelNest" />
      <img src="" alt="Priceline" />
      <img src="" alt="Kayak" />
      <img src="" alt="Agoda" />
      <img src="" alt="OpenTable" />
    </div>
  </div>
</template>

<style scoped>
.footer {
  background-color: #e3e3e3;
  padding: 20px;
  font-size: 14px;
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
</style>
