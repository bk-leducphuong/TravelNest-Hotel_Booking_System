<script setup lang="ts">
import {
  fetchProfile,
  updateProfile,
  type AdminProfile,
} from "~/services/api/account";
import { accountManagementUrl } from "~/services/keycloak";

const { t } = useI18n();
const auth = useAuthStore();
const error = ref("");
const saved = ref({ name: "", email: "", phoneNumber: "" });
const loading = ref(false);
const saving = ref(false);
const profile = ref<AdminProfile | null>(null);

const form = reactive({
  name: "",
  email: "",
  phoneNumber: "",
});

const displayName = (data: AdminProfile) =>
  data.full_name ||
  [data.first_name, data.last_name].filter(Boolean).join(" ") ||
  "";

const applyProfile = (data: AdminProfile) => {
  profile.value = data;
  form.name = displayName(data);
  form.email = data.email ?? "";
  form.phoneNumber = data.phone_number ?? "";
  saved.value = { ...form };
};

useEditorGuard(
  "profile",
  computed(() => JSON.stringify(form) !== JSON.stringify(saved.value)),
  saving
);
watch(
  () => auth.activeHotelId,
  () => {
    if (profile.value && !saving.value) applyProfile(profile.value);
  }
);
const load = async () => {
  error.value = "";
  loading.value = true;
  try {
    applyProfile(await fetchProfile());
  } catch (failure) {
    error.value = (failure as Error).message;
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  if (saving.value || loading.value || !profile.value) return;
  saving.value = true;
  try {
    await updateProfile({
      name: form.name,
      email: form.email || undefined,
      phoneNumber: form.phoneNumber || undefined,
    });
    ElMessage.success(t("settings.saved"));
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const openAccountConsole = () => {
  window.open(accountManagementUrl(), "_blank", "noopener");
};

onMounted(load);
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <UiPageHeader
      :title="$t('settings.title')"
      :subtitle="$t('settings.subtitle')"
    />
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />

    <el-button v-if="error" @click="load">{{ $t("common.refresh") }}</el-button>
    <UiSectionCard>
      <template #header>
        <span class="font-medium">{{ $t("settings.profile") }}</span>
      </template>
      <el-form label-position="top" :disabled="saving || loading || !profile">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <el-form-item :label="$t('settings.displayName')">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item :label="$t('settings.email')">
            <el-input v-model="form.email" type="email" />
          </el-form-item>
          <el-form-item :label="$t('settings.phone')">
            <el-input v-model="form.phoneNumber" placeholder="+1234567890" />
          </el-form-item>
        </div>
        <el-button type="primary" :loading="saving" @click="save">
          {{ $t("common.save") }}
        </el-button>
      </el-form>
    </UiSectionCard>

    <UiSectionCard>
      <template #header>
        <span class="font-medium">{{ $t("settings.security") }}</span>
      </template>
      <p class="text-sm text-muted">{{ $t("settings.passwordManaged") }}</p>
      <el-button class="mt-3" @click="openAccountConsole">
        {{ $t("settings.manageAccount") }}
      </el-button>
    </UiSectionCard>
  </section>
</template>
