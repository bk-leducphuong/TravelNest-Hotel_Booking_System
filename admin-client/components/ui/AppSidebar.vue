<script setup lang="ts">
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  BedDouble,
  Plus,
  CalendarCheck,
  Building2,
  Wallet,
  ArrowUpRight,
  RotateCcw,
  CreditCard,
  Star,
  Settings,
  Users,
} from "lucide-vue-next";
const { groups, active } = useAdminNavigation();
const icons = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  bookings: ClipboardList,
  rooms: BedDouble,
  add: Plus,
  availability: CalendarCheck,
  property: Building2,
  finance: Wallet,
  payouts: ArrowUpRight,
  refunds: RotateCcw,
  accounts: CreditCard,
  reviews: Star,
  settings: Settings,
  team: Users,
};
defineEmits<{ navigate: [] }>();
</script>
<template>
  <nav :aria-label="$t('shell.navigation')" class="space-y-3 px-3 py-4">
    <div v-for="group in groups" :key="group.key">
      <p
        v-if="group.labelKey"
        class="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted"
      >
        {{ $t(group.labelKey) }}
      </p>
      <NuxtLink
        v-for="item in group.items"
        :key="item.to"
        :to="item.to"
        :aria-current="active?.to === item.to ? 'page' : undefined"
        class="my-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
        :class="
          active?.to === item.to
            ? 'bg-soft font-medium text-brand'
            : 'text-muted hover:bg-soft hover:text-brand'
        "
        @click="$emit('navigate')"
      >
        <component
          :is="icons[item.icon as keyof typeof icons]"
          :size="18"
          aria-hidden="true"
        />{{ $t(item.labelKey) }}
      </NuxtLink>
    </div>
  </nav>
</template>
