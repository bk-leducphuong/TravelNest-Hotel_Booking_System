<script setup lang="ts">
import { bookingStatusTagType } from "~/utils/bookings";

const props = defineProps<{ status: string }>();
</script>

<template>
  <el-tag :type="bookingStatusTagType(props.status)" effect="light">
    {{ $t(`bookings.status.${props.status}`) }}
  </el-tag>
</template>
