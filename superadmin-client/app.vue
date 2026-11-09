<script setup lang="ts">
import en from "element-plus/es/locale/lang/en";
import vi from "element-plus/es/locale/lang/vi";
const { locale, t } = useI18n();
const { titleKey } = usePlatformNavigation();
useHead(() => ({
  title: `${t(titleKey.value)} · Trestay Platform`,
  htmlAttrs: { lang: locale.value },
  meta: [{ name: "robots", content: "noindex, nofollow" }],
}));
</script>

<template>
  <el-config-provider :locale="locale === 'vi' ? vi : en">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </el-config-provider>
</template>
