<script setup lang="ts">
import { FINANCE_NAV } from "~/utils/navigation";
const route = useRoute();
</script>
<template>
  <nav
    :aria-label="$t('nav.finance')"
    class="flex flex-wrap gap-2 rounded-panel bg-white p-3"
  >
    <NuxtLink
      v-for="item in FINANCE_NAV"
      :key="item.to"
      :to="item.to"
      class="rounded-xl px-3 py-2 text-sm font-medium"
      :class="
        route.path === item.to
          ? 'bg-soft text-brand'
          : 'text-muted hover:bg-gray-50'
      "
      :aria-current="route.path === item.to ? 'page' : undefined"
      >{{ $t(item.labelKey) }}</NuxtLink
    >
  </nav>
</template>
