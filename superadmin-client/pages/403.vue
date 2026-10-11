<script setup lang="ts">
definePageMeta({
  layout: false,
});

const auth = useAuthStore();

const onLogout = () => {
  auth.logout();
};
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white/90 p-8 text-center shadow-xl shadow-rose-100 ring-1 ring-rose-50"
    >
      <h1 class="text-xl font-semibold tracking-tight text-slate-900">
        Access denied
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Your account does not have platform access. Ask an administrator to
        grant you the <code class="font-mono">admin</code> or
        <code class="font-mono">support_agent</code> role.
      </p>

      <el-button class="mt-6 w-full" @click="onLogout">Sign out</el-button>
    </div>
  </div>
</template>
