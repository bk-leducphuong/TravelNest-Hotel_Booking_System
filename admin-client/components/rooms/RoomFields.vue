<script setup lang="ts">
import { BED_TYPES, ROOM_STATUSES } from "~/services/api/catalog";
import type { RoomDraft } from "~/utils/rooms";
const model = defineModel<RoomDraft>({ required: true });
withDefaults(
  defineProps<{
    section?: "basic" | "configuration" | "all";
    disabled?: boolean;
  }>(),
  { section: "all", disabled: false }
);
</script>
<template>
  <el-form label-position="top" :disabled="disabled">
    <div class="grid gap-x-5 sm:grid-cols-2">
      <template v-if="section !== 'configuration'">
        <el-form-item :label="$t('rooms.roomName')" required
          ><el-input
            v-model="model.roomName"
            :aria-label="$t('rooms.roomName')"
            maxlength="255"
        /></el-form-item>
        <el-form-item :label="$t('rooms.roomType')"
          ><el-input
            v-model="model.roomType"
            maxlength="100"
            :aria-label="$t('rooms.roomType')"
        /></el-form-item>
        <el-form-item :label="$t('common.status')"
          ><el-select
            v-model="model.status"
            :aria-label="$t('common.status')"
            class="w-full"
            ><el-option
              v-for="status in ROOM_STATUSES"
              :key="status"
              :label="$t(`rooms.status.${status}`)"
              :value="status" /></el-select
        ></el-form-item>
      </template>
      <template v-if="section !== 'basic'">
        <el-form-item :label="$t('rooms.bedType')"
          ><el-select
            v-model="model.bedType"
            :placeholder="$t('common.select')"
            :aria-label="$t('rooms.bedType')"
            class="w-full"
            ><el-option
              v-for="bed in BED_TYPES"
              :key="bed"
              :label="$t(`rooms.bed.${bed}`)"
              :value="bed" /></el-select
        ></el-form-item>
        <el-form-item :label="$t('rooms.maxGuests')"
          ><el-input-number
            v-model="model.maxGuests"
            :aria-label="$t('rooms.maxGuests')"
            :min="1"
            :precision="0"
            class="w-full"
        /></el-form-item>
        <el-form-item :label="$t('common.allotment')"
          ><el-input-number
            v-model="model.quantity"
            :aria-label="$t('common.allotment')"
            :min="0"
            :precision="0"
            class="w-full"
        /></el-form-item>
        <el-form-item :label="$t('rooms.roomSize')"
          ><el-input-number
            v-model="model.roomSize"
            :aria-label="$t('rooms.roomSize')"
            :min="0"
            class="w-full"
        /></el-form-item>
      </template>
    </div>
  </el-form>
</template>
