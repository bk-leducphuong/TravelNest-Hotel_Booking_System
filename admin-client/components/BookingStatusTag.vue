<script setup lang="ts">
import { bookingStatusTagType } from "~/utils/bookings";

const props = defineProps<{ status: string }>();
const tone = computed(() => {
  const type = bookingStatusTagType(props.status);
  return type === "primary" ? "info" : type;
});
</script>

<template>
  <UiStatusPill :tone="tone">
    {{ $t(`bookings.status.${props.status}`) }}
  </UiStatusPill>
</template>
