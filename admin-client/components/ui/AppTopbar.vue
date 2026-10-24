<script setup lang="ts">
import { Menu, ChevronDown } from "lucide-vue-next";
const auth = useAuthStore();
const { active } = useAdminNavigation();
const { locale, locales, setLocale } = useI18n();
defineEmits<{ menu: [] }>();
const initials = computed(() =>
  (auth.user?.email ?? "TN").slice(0, 2).toUpperCase()
);
const { mayLeave } = useChangeGuard();
const command = async (value: string) => {
  if (value === "logout") {
    if (await mayLeave()) await auth.logout();
  } else await setLocale(value as "en" | "vi");
};
</script>
<template>
  <header
    class="flex min-h-[72px] flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 md:px-8"
  >
    <div class="flex min-w-0 items-center gap-3">
      <UiIconButton
        class="md:hidden"
        :label="$t('shell.menu')"
        @click="$emit('menu')"
        ><Menu :size="20"
      /></UiIconButton>
      <p class="truncate text-lg font-medium text-ink">
        {{ $t(active?.labelKey ?? "dashboard.title") }}
      </p>
    </div>
    <div class="flex items-center gap-3 md:gap-5">
      <UiQuickSearch />
      <el-dropdown trigger="click" @command="command">
        <button
          type="button"
          class="flex min-h-10 items-center gap-2 rounded-full text-left"
          :aria-label="$t('shell.profile')"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-medium text-white"
            >{{ initials }}</span
          >
          <span class="hidden max-w-48 sm:block"
            ><span class="block truncate text-sm text-ink">{{
              auth.user?.email
            }}</span
            ><span class="block text-xs text-muted">{{
              auth.activeHotel?.role ?? $t("shell.profile")
            }}</span></span
          ><ChevronDown :size="15" aria-hidden="true" />
        </button>
        <template #dropdown
          ><el-dropdown-menu
            ><el-dropdown-item
              v-for="available in locales"
              :key="available.code"
              :command="available.code"
              :disabled="locale === available.code"
              >{{ available.name }}</el-dropdown-item
            ><el-dropdown-item divided command="logout">{{
              $t("shell.logout")
            }}</el-dropdown-item></el-dropdown-menu
          ></template
        >
      </el-dropdown>
    </div>
  </header>
</template>
