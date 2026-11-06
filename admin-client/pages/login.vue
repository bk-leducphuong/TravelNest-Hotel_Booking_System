<script setup lang="ts">
definePageMeta({
  layout: false,
});

const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();

const loading = ref(false);

const errorCode = computed(() =>
  typeof route.query.error === "string" ? route.query.error : ""
);
const hasError = computed(() => Boolean(errorCode.value));
const errorMessage = computed(() => {
  switch (errorCode.value) {
    case "ACCOUNT_DELETED":
      return t("auth.error.accountDeleted");
    case "ACCOUNT_INACTIVE":
      return t("auth.error.accountInactive");
    case "ACCOUNT_CONFLICT":
      return t("auth.error.accountConflict");
    case "EMAIL_VERIFICATION_REQUIRED":
      return t("auth.error.emailVerificationRequired");
    case "KEYCLOAK_SUBJECT_MISMATCH":
      return t("auth.error.subjectMismatch");
    default:
      return t("auth.error.generic");
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
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-soft to-canvas"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-sm ring-1 ring-gray-200"
    >
      <div class="mb-6 flex items-center justify-center gap-3">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white"
        >
          TN
        </span>
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-slate-900">
            TravelNest Admin
          </h1>
          <p class="text-sm text-slate-500">
            {{ $t("auth.signInSubtitle") }}
          </p>
        </div>
      </div>

      <el-alert
        v-if="hasError"
        class="mb-4"
        type="error"
        :closable="false"
        show-icon
        :title="$t('auth.signInFailed')"
        :description="errorMessage"
      />

      <el-button
        v-if="hasError"
        type="primary"
        class="w-full"
        :loading="loading"
        @click="onSignOut"
      >
        {{ $t("auth.signOutDifferent") }}
      </el-button>
      <el-button
        v-else
        type="primary"
        class="w-full"
        :loading="loading"
        @click="onSignIn"
      >
        {{ $t("auth.signInWith") }}
      </el-button>

      <p class="mt-4 text-center text-xs text-muted">
        {{ $t("auth.redirectNotice") }}
      </p>
    </div>
  </div>
</template>
