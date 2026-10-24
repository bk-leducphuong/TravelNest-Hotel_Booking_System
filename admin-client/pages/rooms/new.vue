<script setup lang="ts">
import { createRoom } from "~/services/api/catalog";
import {
  basicRoomPayload,
  configurationPayload,
  roomDraft,
  sameDraft,
} from "~/utils/rooms";
const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();
const form = ref(roomDraft());
const initial = ref(roomDraft());
const pending = ref(false);
const createdId = ref<string | null>(null);
const error = ref("");
const dirty = computed(
  () => !createdId.value && !sameDraft(form.value, initial.value)
);
useEditorGuard("room-create", dirty, pending);
watch(
  () => auth.activeHotelId,
  () => {
    form.value = roomDraft();
    initial.value = roomDraft();
    error.value = "";
    createdId.value = null;
  }
);
const submit = async () => {
  if (
    !auth.activeHotelId ||
    !can("room.create") ||
    pending.value ||
    createdId.value
  )
    return;
  if (!form.value.roomName.trim()) {
    ElMessage.warning(t("rooms.nameRequired"));
    return;
  }
  pending.value = true;
  error.value = "";
  try {
    const room = await createRoom(auth.activeHotelId, {
      ...basicRoomPayload(form.value),
      ...configurationPayload(form.value),
    });
    createdId.value = room.id;
    ElMessage.success(t("rooms.created"));
  } catch (failure) {
    error.value = (failure as Error).message;
  } finally {
    pending.value = false;
  }
  if (createdId.value)
    await navigateTo(`/rooms/${encodeURIComponent(createdId.value)}`, {
      replace: true,
    });
};
</script>
<template>
  <section class="space-y-6">
    <NuxtLink to="/rooms" class="text-sm text-action"
      >← {{ $t("rooms.back") }}</NuxtLink
    >
    <UiPageHeader
      :title="$t('nav.newRoom')"
      :subtitle="auth.activeHotel?.name ?? $t('common.noHotelSelected')"
    />
    <UiEmptyState v-if="!can('room.create')" :title="$t('editor.forbidden')" />
    <UiEmptyState
      v-else-if="!auth.activeHotelId"
      :title="$t('rooms.noHotel')"
    />
    <UiSectionCard
      v-else
      :title="$t('rooms.basicInformation')"
      :description="$t('rooms.createHint')"
    >
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        class="mb-5"
        show-icon
      />
      <el-alert
        v-if="createdId"
        :title="$t('rooms.alreadyCreated')"
        type="success"
        :closable="false"
        class="mb-5"
      />
      <RoomsRoomFields v-model="form" :disabled="pending || !!createdId" />
      <div
        class="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5"
      >
        <el-button
          v-if="!createdId"
          type="primary"
          :loading="pending"
          @click="submit"
          >{{ $t("rooms.addRoom") }}</el-button
        >
        <NuxtLink v-else :to="`/rooms/${createdId}`">{{
          $t("rooms.manage")
        }}</NuxtLink>
        <NuxtLink to="/rooms" class="text-sm text-muted">{{
          $t("common.cancel")
        }}</NuxtLink>
      </div>
    </UiSectionCard>
  </section>
</template>
