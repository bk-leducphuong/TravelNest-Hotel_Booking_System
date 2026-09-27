<script setup lang="ts">
import { bookingStatusLabel, bookingStatusTagType } from "~/utils/bookings";

const props = defineProps<{ status: string }>();
</script>

<template>
  <el-tag :type="bookingStatusTagType(props.status)" effect="light">
    {{ bookingStatusLabel(props.status) }}
  </el-tag>
</template>
