<template>
  <LoginHeader :is-admin-login="true" />
  <div>
    <div class="stepper-wrapper">
      <div class="stepper">
        <div class="progress-line"></div>
        <div class="progress-line-active" :style="{ width: progress + '%' }"></div>
        <!-- Render steps dynamically based on step count -->
        <div
          v-for="(step, index) in steps"
          :key="step"
          :class="['step', { active: step <= currentStep }]"
        >
          <div class="step-circle">{{ index + 1 }}</div>
        </div>
      </div>
    </div>

    <!-- Display current step component -->
    <component :is="currentComponent" class="form" @next="nextStep" @previous="previousStep"/>
  </div>
</template>

<script>
import LoginHeader from '@/components/LoginHeader.vue'
import Form1 from '@/components/join-forms/Form1.vue'
import Form2 from '@/components/join-forms/Form2.vue'
import Form3 from '@/components/join-forms/Form3.vue'
import Form4 from '@/components/join-forms/Form4.vue'
import Form5 from '@/components/join-forms/Form5.vue'
import Form6 from '@/components/join-forms/Form6.vue'

export default {
  components: {
    Form1,
    Form2,
    Form3,
    Form4,
    Form5,
    Form6,
    LoginHeader
  },
  data() {
    return {
      currentStep: 1,
      steps: [1, 2, 3, 4, 5, 6]
    }
  },
  computed: {
    currentComponent() {
      return `Form${this.currentStep}`
    },
    progress() {
      return ((this.currentStep - 1) / (this.steps.length - 1)) * 100
    }
  },
  methods: {
    nextStep() {
      if (this.currentStep < this.steps.length) {
        this.currentStep++
      }
    },
    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    }
  },
  
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family:
    BlinkMacSystemFont,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}
/* header  */
.header {
  background-color: #003b95;
  margin-bottom: 35px;
}

.header .inner-wrap {
  display: flex;
  justify-content: space-between;
  padding: 12px 40px;
  align-items: center;
}

.header .inner-logo strong {
  font-size: 24px;
  color: #fff;
}

.header .inner-login ul {
  display: flex;
  color: #fff;
  list-style-type: none;
  align-items: center;
  margin-bottom: 0;
}

.header .inner-login ul li {
  padding: 10px;
  margin-left: 15px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.header .inner-login ul li:hover {
  background-color: #1a4fa0;
}

.header .inner-login ul li img {
  border-radius: 50%;
  height: 18px;
  overflow: hidden;
  width: auto;
}
.header .inner-login ul li span {
  font-weight: 600;
}

.header .inner-login ul .login {
  padding: 5px 10px;
  color: #1d5fc2;
  font-weight: 500;
  background-color: #fff;
  border-radius: 5px;
}
.header .inner-login ul .guides {
  padding: 5px 10px;
  color: #1d5fc2;
  font-weight: 500;
  background-color: #fff;
  border-radius: 5px;
}

.header .inner-login ul .login:hover {
  background-color: #f0f6fde8;
}
.header .inner-login ul .guides:hover {
  background-color: #f0f6fde8;
}
/* end header  */

/* Step */
.step {
  text-align: center;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.3s ease;
  font-weight: bold;
  color: #757575;
}

.step.active .step-circle {
  border-color: #0358d7;
  background: #0358d7;
  color: white;
}

.step.completed .step-circle {
  background: #0358d7;
  border-color: #0358d7;
  color: white;
}

.step-text {
  margin-top: 10px;
  font-size: 14px;
  color: #757575;
}

.step.active .step-text,
.step.completed .step-text {
  color: #0358d7;
}

.stepper-wrapper {
  margin: 50px auto;
  max-width: 800px;
  padding: 20px;
}

.stepper {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}
/* end step */

/* Progress Line */
.progress-line {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #e0e0e0;
  z-index: -1;
}

.progress-line-active {
  position: absolute;
  top: 20px;
  left: 0;
  height: 2px;
  background: #0358d7;
  transition: width 0.5s ease;
  z-index: -1;
}

/* form */
.form {
    margin-bottom: 40px;
}

</style>
