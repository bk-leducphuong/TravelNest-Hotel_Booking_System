<script setup lang="ts">
const items = [
  { label: "Overview", to: "/finance" },
  { label: "Payments", to: "/finance/payments" },
  { label: "Refunds", to: "/finance/refunds" },
  { label: "Payouts", to: "/finance/payouts" },
  { label: "Ledger", to: "/finance/ledger" },
];
</script>

<template>
  <nav class="flex flex-wrap gap-2">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      active-class="bg-indigo-600 text-white hover:bg-indigo-600"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
