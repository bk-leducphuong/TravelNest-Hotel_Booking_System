<script>
import axios from 'axios';
import { map } from 'leaflet';
import { mapActions, mapGetters } from 'vuex';

export default {
  data() {
    return {
      showPopup: false
    }
  },
  computed: {
    ...mapGetters('user', ['getUserInformation']),
  },
  methods: {
    ...mapActions('auth', ['logout']),
    ...mapActions('user', ['retrieveUserInformation']),
    hidePopup() {
      this.showPopup = false
    },
  },
  async mounted() { 
    await this.retrieveUserInformation()
  }
}
</script>
<template>
  <div class="popup-container" v-click-outside="hidePopup">
    <!-- Main Button -->
    <button @click="this.showPopup = !this.showPopup" class="popup-button">
      <div style="border-radius: 5px; width: 170px; height: 35px; margin: 0 auto">
        <div class="avatar">
          <img v-if="getUserInformation" :src="getUserInformation.profile_picture_url" alt="avatar" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;"/>
          <img v-else src="../../assets/avatar/default_avatar.png" alt="" />
        </div>
        <span>
          <div
            style="
              padding-left: 10px;
              color: white;
              font-weight: bold;
              font-size: 14px;
              float: left;
            "
          >
            <span v-if="getUserInformation">{{ getUserInformation.username }}</span>
            <span v-else>User Name</span>
          </div>
          <div
            style="
              padding-left: 10px;
              color: yellow;
              font-weight: lighter;
              font-size: 10px;
              float: left;
            "
          >
            Genius Level ?
          </div>
        </span>
      </div>
    </button>

    <!-- Popup Content -->
    <Transition name="fade">
      <div v-if="this.showPopup" class="popup">
        <div class="popup-arrow"></div>

        <nav class="nav-menu">
          <a @click="this.$router.push('/account-settings')" class="nav-item">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            </svg>
            <span class="nav-text">Manage account</span>
          </a>

          <a  @click="this.$router.push('/bookings')" class="nav-item">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M8 21V4" />
              <path d="M16 21V4" />
            </svg>
            <span class="nav-text">Bookings & Trips</span>
          </a>

          <a href="#" class="nav-item">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
            <span class="nav-text">Genius loyalty programme</span>
          </a>

          <a href="#" class="nav-item">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span class="nav-text">Rewards & Wallet</span>
          </a>

          <a @click="this.$router.push('/reviews')" class="nav-item">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              />
            </svg>
            <span class="nav-text">Reviews</span>
          </a>

          <a class="nav-item" @click="this.$router.push('/saved-hotels')">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <span class="nav-text">Saved</span>
          </a>

          <a href="#" class="nav-item" @click="this.logout({haveRedirect: true})">
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span class="nav-text">Sign out</span>
          </a>
        </nav>
      </div>
    </Transition>
  </div>
</template>
<style scoped>
.avatar {
  width: 35px;
  height: 35px;
  /* border-radius: 50%; */
  float: left;
  padding-top: 5px;
}
.avatar img {
  object-fit: cover;
  width: 100%;
  height: 100%;
}
.popup-container {
  position: relative;
  display: inline-block;
}

.popup-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.popup {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  z-index: 99999;
}

.popup-arrow {
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: white;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
}

.popup-content {
  position: relative;
  padding: 16px;
}

.popup-content h3 {
  margin: 0 0 8px 0;
  font-size: 10px;
  font-weight: 600;
}

.popup-content p {
  margin: 0 0 12px 0;
  color: #4a5568;
}

.close-button {
  padding: 4px 12px;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #edf2f7;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.nav-menu {
  background-color: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.nav-item:hover {
  background-color: #f5f5f5;
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  opacity: 0.8;
}

.nav-text {
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
