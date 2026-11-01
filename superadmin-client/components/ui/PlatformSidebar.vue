<script setup lang="ts">
import {
  Building2,
  Users,
  LayoutDashboard,
  Wallet,
  ScrollText,
} from "lucide-vue-next";
defineEmits<{ navigate: [] }>();
const { items, active } = usePlatformNavigation();
const icons = {
  hotels: Building2,
  users: Users,
  overview: LayoutDashboard,
  finance: Wallet,
  audit: ScrollText,
};
const groups = computed(() =>
  ["platform", "directory", "finance", "governance"]
    .map((key) => ({
      key,
      items: items.value.filter((item) => item.group === key),
    }))
    .filter((group) => group.items.length)
);
</script>

<template>
  <nav :aria-label="$t('shell.navigation')" class="space-y-5 px-3 py-4">
    <div v-for="group in groups" :key="group.key">
      <p
        class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted"
      >
        {{ $t(`nav.${group.key}`) }}
      </p>
      <NuxtLink
        v-for="item in group.items"
        :key="item.to"
        :to="item.to"
        class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
        :class="
          active?.to === item.to
            ? 'bg-soft font-medium text-brand'
            : 'text-muted hover:bg-gray-50'
        "
        :aria-current="active?.to === item.to ? 'page' : undefined"
        @click="$emit('navigate')"
      >
        <component :is="icons[item.icon]" :size="19" aria-hidden="true" />{{
          $t(item.labelKey)
        }}
      </NuxtLink>
    </div>
    <p v-if="!items.length" class="px-3 text-sm text-muted">
      {{ $t("shell.noAccess") }}
    </p>
  </nav>
</template>
