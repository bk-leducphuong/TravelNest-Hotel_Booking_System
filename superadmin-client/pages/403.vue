<script setup lang="ts">
import { firstPermittedPath } from "~/utils/navigation";
definePageMeta({ layout: false });
const auth = useAuthStore();
const destination = computed(() =>
  auth.isPlatformStaff ? firstPermittedPath(auth.permissions) : undefined
);
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4 py-10">
    <div class="tn-section w-full max-w-lg space-y-5">
      <div class="flex justify-end"><UiLanguageSelect /></div>
      <p class="text-sm font-medium text-brand">TravelNest Platform</p>
      <h1 class="tn-page-title">{{ $t("forbidden.title") }}</h1>
      <p class="text-sm text-muted">
        {{
          $t(
            auth.isPlatformStaff
              ? "forbidden.description"
              : "forbidden.nonStaff"
          )
        }}
      </p>
      <NuxtLink
        v-if="destination"
        :to="destination"
        class="block underline underline-offset-4"
        >{{ $t("forbidden.continue") }}</NuxtLink
      >
      <el-button @click="auth.logout()">{{ $t("shell.logout") }}</el-button>
    </div>
  </main>
</template>
