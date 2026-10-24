<script setup lang="ts">
const auth = useAuthStore();
const mobileNavOpen = ref(false);
const { mayLeave } = useChangeGuard();
const onHotelChange = async (hotelId: string) => {
  if (hotelId === auth.activeHotelId || !(await mayLeave())) return;
  auth.setActiveHotel(hotelId);
};
</script>
<template>
  <div class="min-h-screen bg-canvas text-ink">
    <a
      href="#admin-main"
      class="sr-only z-50 rounded-lg bg-brand p-3 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >{{ $t("shell.skip") }}</a
    >
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-gray-100 bg-white md:flex"
    >
      <NuxtLink to="/" class="flex items-center gap-3 px-5 pb-4 pt-6 text-brand"
        ><span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white"
          >TN</span
        ><span class="text-lg font-semibold tracking-tight"
          >TravelNest</span
        ></NuxtLink
      >
      <div class="px-4 pb-3">
        <label for="desktop-hotel" class="mb-1 block text-xs text-muted">{{
          $t("shell.hotelLabel")
        }}</label
        ><el-select
          v-if="auth.hasHotels"
          id="desktop-hotel"
          :model-value="auth.activeHotelId ?? undefined"
          class="w-full"
          :placeholder="$t('shell.selectHotel')"
          @update:model-value="onHotelChange"
          ><el-option
            v-for="hotel in auth.hotels"
            :key="hotel.id"
            :label="hotel.name || hotel.id"
            :value="hotel.id"
        /></el-select>
        <p v-else class="text-sm text-muted">
          {{ $t("common.noHotelSelected") }}
        </p>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto"><UiAppSidebar /></div>
      <p class="px-5 py-4 text-xs text-muted">{{ $t("shell.workspace") }}</p>
    </aside>
    <div class="flex min-h-screen min-w-0 flex-col md:ml-56">
      <UiAppTopbar @menu="mobileNavOpen = true" />
      <div class="border-t border-gray-100 bg-white px-4 pb-3 pt-2 md:hidden">
        <label for="mobile-hotel" class="mb-1 block text-xs text-muted">{{
          $t("shell.hotelLabel")
        }}</label
        ><el-select
          v-if="auth.hasHotels"
          id="mobile-hotel"
          :model-value="auth.activeHotelId ?? undefined"
          class="w-full"
          :placeholder="$t('shell.selectHotel')"
          @update:model-value="onHotelChange"
          ><el-option
            v-for="hotel in auth.hotels"
            :key="hotel.id"
            :label="hotel.name || hotel.id"
            :value="hotel.id"
        /></el-select>
        <p v-else class="text-sm text-muted">
          {{ $t("common.noHotelSelected") }}
        </p>
      </div>
      <main
        id="admin-main"
        tabindex="-1"
        class="w-full min-w-0 flex-1 px-4 py-6 md:p-8"
      >
        <slot />
      </main>
      <UiAppFooter />
    </div>
    <el-drawer
      v-model="mobileNavOpen"
      direction="ltr"
      size="min(85%, 300px)"
      :title="$t('shell.navigation')"
      ><UiAppSidebar @navigate="mobileNavOpen = false"
    /></el-drawer>
  </div>
</template>
