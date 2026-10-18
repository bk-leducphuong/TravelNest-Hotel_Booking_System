<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { fetchProfile, updateProfile, type AdminProfile } from "~/services/api/account";
import { accountManagementUrl } from "~/services/keycloak";

const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const profile = ref<AdminProfile | null>(null);

const form = reactive({
  name: "",
  email: "",
  phoneNumber: "",
});

const displayName = (data: AdminProfile) =>
  data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "";

const applyProfile = (data: AdminProfile) => {
  profile.value = data;
  form.name = displayName(data);
  form.email = data.email ?? "";
  form.phoneNumber = data.phone_number ?? "";
};

const load = async () => {
  loading.value = true;
  try {
    applyProfile(await fetchProfile());
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const save = async () => {
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
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
        {{ $t("settings.title") }}
      </h2>
      <p class="mt-1 text-sm text-slate-500">{{ $t("settings.subtitle") }}</p>
    </div>

    <el-card class="shadow-sm">
      <template #header>
        <span class="font-medium">{{ $t("settings.profile") }}</span>
      </template>
      <el-form label-position="top">
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
    </el-card>

    <el-card class="shadow-sm">
      <template #header>
        <span class="font-medium">{{ $t("settings.security") }}</span>
      </template>
      <p class="text-sm text-slate-500">{{ $t("settings.passwordManaged") }}</p>
      <el-button class="mt-3" @click="openAccountConsole">
        {{ $t("settings.manageAccount") }}
      </el-button>
    </el-card>
  </section>
</template>
