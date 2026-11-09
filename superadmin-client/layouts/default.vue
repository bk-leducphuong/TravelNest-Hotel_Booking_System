<script setup lang="ts">
import { Menu, LogOut, Globe2 } from "lucide-vue-next";
const auth = useAuthStore();
const { titleKey } = usePlatformNavigation();
const route = useRoute();
const mobileNavOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);
watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  }
);
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink">
    <a
      href="#platform-main"
      class="sr-only z-50 rounded-lg bg-brand p-3 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >{{ $t("shell.skip") }}</a
    >
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-gray-100 bg-white md:flex"
    >
      <div class="flex items-center gap-3 px-5 pb-3 pt-6 text-brand">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white"
          >TS</span
        >
        <span class="text-lg font-semibold tracking-tight">Trestay</span>
      </div>
      <p class="px-5 pb-4 text-xs text-muted">{{ $t("shell.workspace") }}</p>
      <div class="min-h-0 flex-1 overflow-y-auto"><UiPlatformSidebar /></div>
      <div class="border-t border-gray-100 px-5 py-4 text-xs text-muted">
        <Globe2 :size="16" class="mb-2" aria-hidden="true" />{{
          $t("shell.context")
        }}
      </div>
    </aside>
    <div class="flex min-h-screen min-w-0 flex-col md:ml-56">
      <header class="sticky top-0 z-20 border-b border-gray-100 bg-white">
        <div
          class="flex min-h-20 items-center justify-between gap-2 px-4 py-3 md:px-8"
        >
          <div class="flex min-w-0 items-center gap-3">
            <button
              ref="menuButton"
              type="button"
              class="tn-icon-button inline-flex md:hidden"
              :aria-label="$t('shell.menu')"
              :aria-expanded="mobileNavOpen"
              aria-haspopup="dialog"
              @click="mobileNavOpen = true"
            >
              <Menu :size="20" aria-hidden="true" />
            </button>
            <span class="hidden truncate text-sm font-medium sm:block">{{
              $t(titleKey)
            }}</span>
          </div>
          <div class="flex flex-shrink-0 items-center gap-2">
            <UiQuickSearch />
            <UiLanguageSelect />
            <el-dropdown trigger="click">
              <button
                type="button"
                class="tn-icon-button inline-flex"
                :aria-label="$t('shell.account')"
              >
                <LogOut :size="18" aria-hidden="true" />
              </button>
              <template #dropdown
                ><el-dropdown-menu>
                  <li
                    class="max-w-64 break-all px-4 py-2 text-xs text-muted"
                    role="presentation"
                  >
                    {{ auth.user?.email }}
                  </li>
                  <el-dropdown-item @click="auth.logout()">{{
                    $t("shell.logout")
                  }}</el-dropdown-item>
                </el-dropdown-menu></template
              >
            </el-dropdown>
          </div>
        </div>
        <p class="px-4 pb-3 text-xs text-muted md:hidden">
          {{ $t("shell.context") }}
        </p>
      </header>
      <main
        id="platform-main"
        tabindex="-1"
        class="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 px-4 py-6 md:p-8"
      >
        <slot />
      </main>
      <footer class="px-4 py-6 text-xs text-muted md:px-8">
        © {{ new Date().getFullYear() }} {{ $t("shell.footer") }}
        <p class="mt-1">
          Personal learning project — not affiliated with Travelnest Ltd or any
          commercial booking service.
        </p>
      </footer>
    </div>
    <el-drawer
      v-model="mobileNavOpen"
      direction="ltr"
      size="min(85%, 320px)"
      :title="$t('shell.navigation')"
      @closed="menuButton?.focus()"
    >
      <UiPlatformSidebar @navigate="mobileNavOpen = false" />
    </el-drawer>
  </div>
</template>
