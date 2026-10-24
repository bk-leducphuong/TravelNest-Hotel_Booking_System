<script setup lang="ts">
import {
  HOTEL_ROLE_NAMES,
  addHotelStaff,
  fetchHotelStaff,
  removeHotelStaff,
  updateHotelStaff,
  type HotelStaffMember,
} from "~/services/api/staff";

const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();

const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
const saving = ref(false);
const staff = ref<HotelStaffMember[]>([]);

const dialog = ref(false);
const form = reactive({
  email: "",
  role: "staff" as string,
});

const memberName = (member: HotelStaffMember) =>
  [member.firstName, member.lastName].filter(Boolean).join(" ") ||
  member.email ||
  member.userId;

const load = async () => {
  const current = listRequests.begin();
  listError.value = "";
  staff.value = [];
  loading.value = false;
  if (!auth.activeHotelId || !can("hotel.manage_staff")) {
    staff.value = [];
    return;
  }
  loading.value = true;
  try {
    const result = await fetchHotelStaff(auth.activeHotelId);
    if (!current()) return;
    staff.value = result;
  } catch (error) {
    if (current()) listError.value = (error as Error).message;
  } finally {
    if (current()) loading.value = false;
  }
};

const openAdd = () => {
  form.email = "";
  form.role = "staff";
  dialog.value = true;
};

const submit = async () => {
  if (!auth.activeHotelId || saving.value || !can("hotel.manage_staff")) {
    return;
  }
  if (!form.email.trim()) {
    ElMessage.warning(t("team.emailRequired"));
    return;
  }
  saving.value = true;
  try {
    await addHotelStaff(auth.activeHotelId, {
      email: form.email.trim(),
      role: form.role,
    });
    ElMessage.success(t("team.added"));
    dialog.value = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

useEditorGuard(
  "team",
  computed(() => dialog.value),
  saving
);
const changeRole = async (member: HotelStaffMember, role: string) => {
  if (
    !auth.activeHotelId ||
    saving.value ||
    !can("hotel.manage_staff") ||
    role === member.role
  ) {
    return;
  }
  saving.value = true;
  try {
    try {
      await updateHotelStaff(auth.activeHotelId, member.userId, { role });
      ElMessage.success(t("team.updated"));
      await load();
    } catch (error) {
      ElMessage.error((error as Error).message);
      await load();
    }
  } finally {
    saving.value = false;
  }
};

const remove = async (member: HotelStaffMember) => {
  if (!auth.activeHotelId || saving.value || !can("hotel.manage_staff")) {
    return;
  }
  saving.value = true;
  try {
    try {
      await ElMessageBox.confirm(
        t("team.confirmRemove", { name: memberName(member) }),
        t("team.removeTitle"),
        { type: "warning", confirmButtonText: t("common.delete") }
      );
    } catch {
      return;
    }
    try {
      await removeHotelStaff(auth.activeHotelId, member.userId);
      ElMessage.success(t("team.removed"));
      await load();
    } catch (error) {
      ElMessage.error((error as Error).message);
    }
  } finally {
    saving.value = false;
  }
};

watch([() => auth.activeHotelId, () => can("hotel.manage_staff")], load, {
  immediate: true,
});
</script>

<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('team.title')"
      :subtitle="auth.activeHotel?.name || $t('common.noHotelSelected')"
      ><template #actions
        ><div class="flex flex-wrap items-center gap-2">
          <el-button
            :loading="loading"
            :disabled="!auth.activeHotelId"
            @click="load"
          >
            {{ $t("common.refresh") }}
          </el-button>
          <Can permission="hotel.manage_staff">
            <el-button
              type="primary"
              :disabled="!auth.activeHotelId"
              @click="openAdd"
            >
              {{ $t("team.addMember") }}
            </el-button>
          </Can>
        </div></template
      ></UiPageHeader
    >

    <UiEmptyState
      v-if="!can('hotel.manage_staff')"
      :title="$t('editor.forbidden')"
    />
    <el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('team.noHotel')"
    />

    <UiSectionCard v-else v-loading="loading">
      <el-alert
        v-if="listError"
        :title="listError"
        type="error"
        :closable="false"
        show-icon
      />
      <div
        class="tn-table-region"
        role="region"
        :aria-label="$t('common.details')"
        tabindex="0"
      >
        <el-table :data="staff" row-key="id" style="width: 100%">
          <el-table-column :label="$t('team.member')" min-width="220">
            <template #default="{ row }">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-ink">{{
                  memberName(row as HotelStaffMember)
                }}</span>
                <el-tag v-if="row.isPrimaryOwner" type="success" size="small">
                  {{ $t("team.primaryOwner") }}
                </el-tag>
              </div>
              <p class="text-xs text-muted">{{ row.email }}</p>
            </template>
          </el-table-column>
          <el-table-column :label="$t('team.role')" width="200">
            <template #default="{ row }">
              <el-select
                v-if="can('hotel.manage_staff')"
                :model-value="row.role"
                size="small"
                class="w-full"
                :disabled="saving"
                @update:model-value="
                  (value: string) => changeRole(row as HotelStaffMember, value)
                "
              >
                <el-option
                  v-for="role in HOTEL_ROLE_NAMES"
                  :key="role"
                  :label="role"
                  :value="role"
                />
              </el-select>
              <span v-else>{{ row.role }}</span>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            width="120"
            fixed="right"
          >
            <template #default="{ row }">
              <Can permission="hotel.manage_staff">
                <el-button
                  size="small"
                  type="danger"
                  plain
                  @click="remove(row as HotelStaffMember)"
                >
                  {{ $t("common.delete") }}
                </el-button>
              </Can>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('team.empty')" :image-size="60" />
          </template>
        </el-table>
      </div>
    </UiSectionCard>

    <el-dialog v-model="dialog" :title="$t('team.addMember')" width="460px">
      <el-form label-position="top">
        <el-form-item :label="$t('team.email')">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="person@example.com"
          />
        </el-form-item>
        <el-form-item :label="$t('team.role')">
          <el-select v-model="form.role" class="w-full">
            <el-option
              v-for="role in HOTEL_ROLE_NAMES"
              :key="role"
              :label="role"
              :value="role"
            />
          </el-select>
        </el-form-item>
        <p class="text-xs text-muted">{{ $t("team.addHint") }}</p>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{
          $t("common.save")
        }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>
