<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const auth = useAuthStore();
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
        Welcome back, {{ auth.user?.firstName || auth.user?.email }} 👋
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        This is your TravelNest Admin dashboard. You can expand this page with
        analytics, property lists, and booking overviews.
      </p>
    </div>

    <el-card class="shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Session Info</span>
        </div>
      </template>

      <div class="space-y-2 text-sm text-slate-700">
        <p>
          <span class="font-medium">Email:</span>
          {{ auth.user?.email }}
        </p>
        <p>
          <span class="font-medium">Name:</span>
          {{ auth.user?.firstName }} {{ auth.user?.lastName }}
        </p>
        <p>
          <span class="font-medium">Role:</span>
          {{ auth.user?.role }}
        </p>
        <p>
          <span class="font-medium">Session ID:</span>
          <span class="font-mono text-xs text-slate-500">
            {{ auth.session?.sessionId }}
          </span>
        </p>
      </div>
    </el-card>
  </section>
</template>
