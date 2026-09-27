<script setup lang="ts">
definePageMeta({
  layout: false,
});

const auth = useAuthStore();
const route = useRoute();

const loading = ref(false);

const onSignIn = async () => {
  loading.value = true;
  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
  try {
    await auth.login(redirect);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50">
    <div class="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl shadow-emerald-100 ring-1 ring-emerald-50">
      <div class="mb-6 flex items-center justify-center gap-3">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl font-semibold text-white"
        >
          TN
        </span>
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-slate-900">TravelNest Admin</h1>
          <p class="text-sm text-slate-500">Sign in to manage your properties and bookings</p>
        </div>
      </div>

      <el-button type="primary" class="w-full" :loading="loading" @click="onSignIn">
        Sign in with TravelNest
      </el-button>

      <p class="mt-4 text-center text-xs text-slate-400">
        You will be redirected to the secure sign-in page.
      </p>
    </div>
  </div>
</template>
