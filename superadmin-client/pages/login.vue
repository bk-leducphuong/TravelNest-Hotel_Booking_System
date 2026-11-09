<script setup lang="ts">
definePageMeta({ layout: false });
const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();
const loading = ref(false);
const localError = ref(false);
const errorCode = computed(() =>
  typeof route.query.error === "string" ? route.query.error : ""
);
const errorMessage = computed(() => {
  const known = [
    "ACCOUNT_DELETED",
    "ACCOUNT_INACTIVE",
    "ACCOUNT_CONFLICT",
    "EMAIL_VERIFICATION_REQUIRED",
    "KEYCLOAK_SUBJECT_MISMATCH",
  ];
  return t(
    known.includes(errorCode.value)
      ? `login.${errorCode.value}`
      : "login.genericError"
  );
});
const onSignIn = async () => {
  loading.value = true;
  localError.value = false;
  const value = route.query.redirect;
  // Only an internal path may become the provider's return destination.
  const redirect =
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value)
      ? value
      : "/";
  try {
    await auth.login(redirect);
  } catch {
    localError.value = true;
  } finally {
    loading.value = false;
  }
};
const onSignOut = async () => {
  loading.value = true;
  localError.value = false;
  try {
    await auth.logout();
  } catch {
    localError.value = true;
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <main class="flex min-h-screen items-center justify-center px-4 py-10">
    <div class="tn-section w-full max-w-lg space-y-6">
      <div class="flex justify-end"><UiLanguageSelect /></div>
      <div class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand font-semibold text-white"
          >TS</span
        >
        <h1 class="text-xl font-semibold tracking-tight text-brand">
          {{ $t("login.title") }}
        </h1>
      </div>
      <p class="text-sm text-muted">{{ $t("login.subtitle") }}</p>
      <div
        v-if="errorCode || localError"
        role="alert"
        class="space-y-2 rounded-xl bg-soft p-4"
      >
        <h2 class="font-medium">{{ $t("login.failed") }}</h2>
        <p class="text-sm">{{ errorMessage }}</p>
      </div>
      <el-button
        v-if="errorCode"
        type="primary"
        class="!ml-0 w-full !whitespace-normal"
        :loading="loading"
        @click="onSignOut"
        >{{ $t("login.signOut") }}</el-button
      >
      <el-button
        v-else
        type="primary"
        class="!ml-0 w-full"
        :loading="loading"
        @click="onSignIn"
        >{{ $t("login.signIn") }}</el-button
      >
      <p class="text-xs text-muted">{{ $t("login.secure") }}</p>
    </div>
  </main>
</template>
