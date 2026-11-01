<script setup lang="ts">
import { firstPermittedPath } from "~/utils/navigation";
definePageMeta({ platformTitle: "notFound.title" });
const auth = useAuthStore();
const destination = computed(
  () => firstPermittedPath(auth.permissions) ?? "/403"
);
</script>
<template>
  <UiSectionCard>
    <h1 class="tn-page-title">{{ $t("notFound.title") }}</h1>
    <p class="mb-6 mt-3 text-sm text-muted">{{ $t("notFound.description") }}</p>
    <NuxtLink :to="destination" class="underline underline-offset-4">{{
      $t("notFound.continue")
    }}</NuxtLink>
  </UiSectionCard>
</template>
