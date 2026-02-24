<template>
  <div class="loading-popup-container" v-if="openLoadingPopup">
    <div class="loading-popup">
      <!-- Using vue-loading-overlay -->
      <Loading
        :active="isLoading"
        :can-cancel="false"
        :is-full-page="false"
        :loader="'dots'"
        background-color="transparent"
        v-if="!fail"
      >
      </Loading>
      <i
        class="fa fa-check-circle"
        aria-hidden="true"
        style="color: #00ff4c; font-size: 60px; margin-top: 50px"
        v-if="isLoaded && !fail"
      ></i>
      <i
        class="fa fa-times-circle"
        aria-hidden="true"
        style="color: red; font-size: 60px; margin-top: 50px"
        v-if="fail"
      ></i>
      <div class="title" v-if="isLoading && !fail">{{ startTitle }}</div>
      <div class="title" v-if="isLoaded && !fail">{{ endTitle }}</div>
      <div class="title" v-if="fail">Process failed! Please try again later.</div>
    </div>
  </div>
</template>

<script>
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

export default {
  components: {
    Loading
  },
  props: {
    isLoading: {
      type: Boolean,
      required: true
    },
    startTitle: {
      type: String,
      required: true
    },
    endTitle: {
      type: String,
      required: true
    },
    isLoaded: {
      type: Boolean,
      required: true
    },
    redirectUrl: {
      type: String,
      required: false
    },
    fail: {
      type: Boolean,
      required: false
    }
  },
  data() {
    return {
      openLoadingPopup: false
    }
  },
  watch: {
    isLoaded(newValue) {
      if (newValue == true) {
        setTimeout(() => {
          this.openLoadingPopup = false
          if (this.redirectUrl) {
            setTimeout(() => {
              this.$router.push(this.redirectUrl)
            }, 2000)
          }
        }, 2000)
      }
    },
    isLoading(newValue) {
      if (newValue == true) {
        this.openLoadingPopup = true
      }
    },
    fail(newValue) {
      if (newValue == true) {
        setTimeout(() => {
          this.openLoadingPopup = false
          this.$router.go() // reload page
        }, 2000)
        // this.openLoadingPopup = false
      }
    }
  }
}
</script>

<style scoped>
.loading-popup-container {
  position: fixed;
  z-index: 99999999;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-popup {
  position: relative;
  width: 400px;
  height: 180px;
  background-color: #fff;
  border-radius: 20px;
  /* padding: 20px; */
  text-align: center;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
  bottom: 20px;
  position: absolute;
  text-align: center;
  width: 100%;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}
</style>
