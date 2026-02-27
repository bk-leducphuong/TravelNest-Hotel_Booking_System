<script setup lang="ts">
const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header
      v-if="auth.isAuthenticated"
      class="border-b bg-white/80 backdrop-blur sticky top-0 z-20"
    >
      <nav
        class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-semibold"
          >
            TN
          </span>
          <span class="text-lg font-semibold tracking-tight">
            TravelNest Admin
          </span>
        </div>

        <div class="flex items-center gap-6 text-sm font-medium">
          <NuxtLink to="/" class="hover:text-emerald-600 transition-colors">
            Home
          </NuxtLink>
          <NuxtLink
            to="/"
            class="hover:text-emerald-600 transition-colors hidden sm:inline"
          >
            Dashboard
          </NuxtLink>
          <span class="hidden sm:inline text-slate-500">
            {{ auth.user?.email }}
          </span>

          <el-button type="danger" size="small" @click="auth.logoutAndRedirect">
            Logout
          </el-button>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-10">
      <slot />
    </main>
  </div>
</template>

