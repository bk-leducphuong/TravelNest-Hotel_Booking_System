<script setup lang="ts">
definePageMeta({
  layout: false,
});

const auth = useAuthStore();
const route = useRoute();

const loading = ref(false);

const errorCode = computed(() =>
  typeof route.query.error === "string" ? route.query.error : ""
);
const hasError = computed(() => Boolean(errorCode.value));
const errorMessage = computed(() => {
  switch (errorCode.value) {
    case "ACCOUNT_DELETED":
      return "This account has been deleted. Please contact support if you believe this is a mistake.";
    case "ACCOUNT_INACTIVE":
      return "This account is inactive. Please contact support.";
    case "ACCOUNT_CONFLICT":
      return "An account with this email address already exists. Please contact support.";
    case "EMAIL_VERIFICATION_REQUIRED":
      return "Please verify your email address before signing in.";
    case "KEYCLOAK_SUBJECT_MISMATCH":
      return "This account is linked to a different sign-in identity. Please contact support.";
    default:
      return "We couldn't complete sign-in. Please try again, or contact support if it keeps happening.";
  }
});

const onSignIn = async () => {
  loading.value = true;
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : "/";
  try {
    await auth.login(redirect);
  } finally {
    loading.value = false;
  }
};

const onSignOut = async () => {
  loading.value = true;
  try {
    await auth.logout();
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-sky-50"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl shadow-indigo-100 ring-1 ring-indigo-50"
    >
      <div class="mb-6 flex items-center justify-center gap-3">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-xl font-semibold text-white"
        >
          TN
        </span>
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-slate-900">
            TravelNest Platform
          </h1>
          <p class="text-sm text-slate-500">
            Sign in to monitor hotels, users and finances
          </p>
        </div>
      </div>

      <el-alert
        v-if="hasError"
        class="mb-4"
        type="error"
        :closable="false"
        show-icon
        title="Sign-in failed"
        :description="errorMessage"
      />

      <el-button
        v-if="hasError"
        type="primary"
        class="w-full"
        :loading="loading"
        @click="onSignOut"
      >
        Sign out and use a different account
      </el-button>
      <el-button
        v-else
        type="primary"
        class="w-full"
        :loading="loading"
        @click="onSignIn"
      >
        Sign in with TravelNest
      </el-button>

      <p class="mt-4 text-center text-xs text-slate-400">
        You will be redirected to the secure sign-in page.
      </p>
    </div>
  </div>
</template>
