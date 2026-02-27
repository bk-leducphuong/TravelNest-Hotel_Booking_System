<script setup lang="ts">
const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const formRef = ref();
const form = reactive({
  email: "",
  password: "",
});

const rules = {
  email: [
    { required: true, message: "Please input email", trigger: "blur" },
    {
      type: "email",
      message: "Please input a valid email address",
      trigger: ["blur", "change"],
    },
  ],
  password: [
    { required: true, message: "Please input password", trigger: "blur" },
    { min: 6, message: "Password must be at least 6 characters", trigger: "blur" },
  ],
};

const onSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    try {
      loading.value = true;
      await auth.login(form.email, form.password);
      await router.push("/");
    } catch (error: any) {
      const message =
        error?.response?._data?.message ??
        error?.message ??
        "Unable to sign you in. Please check your credentials and try again.";
      ElMessage.error(message);
    } finally {
      loading.value = false;
    }
  });
};

const onOauthClick = (provider: string) => {
  ElMessage.info(`OAuth login with ${provider} is not implemented yet.`);
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50">
    <div
      class="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl shadow-emerald-100 ring-1 ring-emerald-50"
    >
      <div class="mb-6 flex items-center justify-center gap-3">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-xl font-semibold"
        >
          TN
        </span>
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-slate-900">
            TravelNest Admin
          </h1>
          <p class="text-sm text-slate-500">
            Sign in to manage your properties and bookings
          </p>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="space-y-4"
      >
        <el-form-item label="Email" prop="email">
          <el-input
            v-model="form.email"
            placeholder="admin@travelnest.com"
            type="email"
            autocomplete="email"
          />
        </el-form-item>

        <el-form-item label="Password" prop="password">
          <el-input
            v-model="form.password"
            placeholder="••••••••"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="w-full"
            :loading="loading"
            @click="onSubmit"
          >
            Login
          </el-button>
        </el-form-item>
      </el-form>

      <div class="my-4 flex items-center gap-3 text-xs text-slate-400">
        <div class="h-px flex-1 bg-slate-200" />
        <span>Or continue with</span>
        <div class="h-px flex-1 bg-slate-200" />
      </div>

      <div class="flex gap-3">
        <el-button class="flex-1" @click="onOauthClick('Google')">
          <span class="mr-2 text-lg">G</span>
          Google
        </el-button>
        <el-button class="flex-1" @click="onOauthClick('Twitter')">
          <span class="mr-2 text-lg">𝕏</span>
          Twitter
        </el-button>
      </div>
    </div>
  </div>
</template>

