<script setup lang="ts">
const auth = useAuthStore();
const { can } = usePermissions();
const { locale, locales, setLocale } = useI18n();

const navItems = computed(() => ADMIN_NAV.filter((item) => !item.permission || can(item.permission)));

const mobileNavOpen = ref(false);

const onHotelChange = (hotelId: string) => {
  auth.setActiveHotel(hotelId);
};

const onLogout = () => {
  auth.logout();
};

const onLocaleChange = (value: string) => {
  setLocale(value);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="flex min-h-screen">
      <aside class="hidden w-60 flex-shrink-0 bg-slate-900 text-slate-100 md:flex md:flex-col">
        <div class="flex items-center gap-2 px-5 py-4">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white"
          >
            TN
          </span>
          <span class="text-lg font-semibold tracking-tight">TravelNest Admin</span>
        </div>

        <nav class="mt-2 flex-1 space-y-1 px-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            active-class="bg-emerald-600 text-white hover:bg-emerald-600"
          >
            {{ $t(item.labelKey) }}
          </NuxtLink>
        </nav>

        <div class="px-5 py-4 text-xs text-slate-400">
          {{ auth.user?.email }}
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-3">
              <el-button
                class="md:hidden"
                size="small"
                :aria-label="$t('shell.menu')"
                @click="mobileNavOpen = true"
              >
                <span class="text-lg leading-none">☰</span>
              </el-button>
              <span class="text-sm font-medium text-slate-500">{{ $t('shell.hotelLabel') }}</span>
              <el-select
                v-if="auth.hasHotels"
                :model-value="auth.activeHotelId ?? undefined"
                class="w-40 md:w-64"
                :placeholder="$t('shell.selectHotel')"
                @update:model-value="onHotelChange"
              >
                <el-option
                  v-for="hotel in auth.hotels"
                  :key="hotel.id"
                  :label="hotel.name || hotel.id"
                  :value="hotel.id"
                />
              </el-select>
              <el-tag v-else type="info">{{ $t('shell.allHotels') }}</el-tag>
            </div>

            <div class="flex items-center gap-3">
              <el-tag v-if="auth.activeHotel?.role" type="success" effect="plain">
                {{ auth.activeHotel?.role }}
              </el-tag>
              <el-select
                :model-value="locale"
                size="small"
                class="w-32"
                :aria-label="$t('shell.language')"
                @update:model-value="onLocaleChange"
              >
                <el-option
                  v-for="available in locales"
                  :key="available.code"
                  :label="available.name"
                  :value="available.code"
                />
              </el-select>
              <el-button size="small" @click="onLogout">{{ $t('shell.logout') }}</el-button>
            </div>
          </div>
        </header>

        <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <slot />
        </main>
      </div>
    </div>

    <el-drawer
      v-model="mobileNavOpen"
      direction="ltr"
      size="70%"
      :with-header="false"
      class="md:hidden"
    >
      <div class="flex items-center gap-2 px-1 py-2">
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white"
        >
          TN
        </span>
        <span class="text-lg font-semibold tracking-tight text-slate-900">TravelNest Admin</span>
      </div>

      <nav class="mt-4 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          active-class="bg-emerald-600 text-white hover:bg-emerald-600"
          @click="mobileNavOpen = false"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>
      </nav>

      <div class="mt-6 px-1 text-xs text-slate-400">
        {{ auth.user?.email }}
      </div>
    </el-drawer>
  </div>
</template>
