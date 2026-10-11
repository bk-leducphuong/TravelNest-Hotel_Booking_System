<script setup lang="ts">
const auth = useAuthStore();
const { can } = usePermissions();

const navItems = computed(() =>
  SUPERADMIN_NAV.filter((item) => !item.permission || can(item.permission))
);

const onLogout = () => {
  auth.logout();
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="flex min-h-screen">
      <aside
        class="hidden w-60 flex-shrink-0 bg-slate-900 text-slate-100 md:flex md:flex-col"
      >
        <div class="flex items-center gap-2 px-5 py-4">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-semibold text-white"
          >
            TN
          </span>
          <span class="text-lg font-semibold tracking-tight">
            TravelNest Platform
          </span>
        </div>

        <nav class="mt-2 flex-1 space-y-1 px-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            active-class="bg-indigo-600 text-white hover:bg-indigo-600"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="px-5 py-4 text-xs text-slate-400">
          {{ auth.user?.email }}
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div
            class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-slate-500">
                Platform monitoring
              </span>
              <el-tag type="info" effect="plain">Cross-tenant</el-tag>
            </div>

            <div class="flex items-center gap-3">
              <el-tag
                v-for="role in auth.globalRoles"
                :key="role"
                type="success"
                effect="plain"
              >
                {{ role }}
              </el-tag>
              <el-button size="small" @click="onLogout">Logout</el-button>
            </div>
          </div>
        </header>

        <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
