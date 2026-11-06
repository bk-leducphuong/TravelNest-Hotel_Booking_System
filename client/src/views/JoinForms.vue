<template>
  <LoginHeader :isAdminLogin="true" />
  <main id="guest-main" tabindex="-1" class="guest-page onboarding-page">
    <h1 class="guest-page-title">{{ $t('join.registerTitle') }}</h1>
    <p class="guest-subtitle">
      {{ $t('bookingFlow.stepOf', { step: currentStep + 1, total: steps.length }) }}
    </p>
    <div class="stepper-wrapper">
      <div class="stepper">
        <div class="progress-line"></div>
        <div class="progress-line-active" :style="{ width: progress + '%' }"></div>
        <!-- Render steps dynamically based on step count -->
        <div
          v-for="(step, index) in steps"
          :key="step"
          :class="['step', { active: index <= currentStep }]"
        >
          <div class="step-circle">{{ index + 1 }}</div>
        </div>
      </div>
    </div>

    <!-- Display current step component -->
    <component :is="currentComponent" @next="nextStep" @previous="previousStep" class="form" />
  </main>
  <TheFooter />
</template>

<script>
  import TheFooter from '@/components/Footer.vue';
  import LoginHeader from '@/components/LoginHeader.vue';
  import Form1 from '@/components/join-forms/Form1.vue';
  import Form2 from '@/components/join-forms/Form2.vue';
  import Form4 from '@/components/join-forms/Form4.vue';
  import Form5 from '@/components/join-forms/Form5.vue';
  import Form6 from '@/components/join-forms/Form6.vue';

  // Registration wizard steps, in order. The amenities step was removed because
  // the backend has no column/junction write for it.
  const STEP_COMPONENTS = ['Form1', 'Form2', 'Form4', 'Form5', 'Form6'];

  export default {
    components: {
      Form1,
      Form2,
      Form4,
      Form5,
      Form6,
      LoginHeader,
      TheFooter,
    },
    data() {
      return {
        currentStep: 0,
        steps: STEP_COMPONENTS,
      };
    },
    computed: {
      currentComponent() {
        return this.steps[this.currentStep];
      },
      progress() {
        return (this.currentStep / (this.steps.length - 1)) * 100;
      },
    },
    methods: {
      nextStep() {
        if (this.currentStep < this.steps.length - 1) {
          this.currentStep++;
        }
      },
      previousStep() {
        if (this.currentStep > 0) {
          this.currentStep--;
        }
      },
    },
  };
</script>

<style scoped>
  .onboarding-page {
    max-width: 850px;
  }
  .stepper-wrapper {
    margin: 24px 0;
  }
  .stepper {
    display: flex;
    gap: 12px;
  }
  .step {
    flex: 1;
    border-radius: 10px;
    background: #ddd;
    height: 6px;
  }
  .step.active {
    background: var(--tn-action);
  }
  .step-circle,
  .progress-line,
  .progress-line-active {
    display: none;
  }
  .onboarding-page :deep(.multi-step-form) {
    width: 100%;
    margin: 24px 0;
  }
  .onboarding-page :deep(.card) {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    border-radius: 20px;
    box-shadow: none;
    border: 0;
    padding: 24px;
    background: white;
    margin: 0;
  }
  .onboarding-page :deep(input),
  .onboarding-page :deep(select),
  .onboarding-page :deep(textarea) {
    max-width: 100%;
    box-sizing: border-box;
    border-radius: 10px;
    min-height: 44px;
  }
  .onboarding-page :deep(button) {
    border-radius: 10px;
    min-height: 44px;
  }
  .onboarding-page :deep(button:not(:disabled)) {
    background: var(--tn-action);
    color: white;
  }
  .onboarding-page :deep(.title) {
    font-weight: 500;
    font-size: 22px;
  }
</style>
<style scoped>
  .onboarding-page :deep(.multi-step-form),
  .onboarding-page :deep(.card) {
    animation: none;
    opacity: 1;
  }
  .onboarding-page :deep(.title),
  .onboarding-page :deep(label) {
    color: var(--tn-ink);
  }
</style>
