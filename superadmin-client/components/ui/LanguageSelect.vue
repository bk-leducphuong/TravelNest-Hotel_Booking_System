<script setup lang="ts">
const { locale, setLocale } = useI18n();
</script>
<template>
  <label class="inline-flex items-center gap-2 text-sm text-muted">
    <span class="sr-only">{{ $t("shell.language") }}</span>
    <select
      :value="locale"
      class="min-h-10 max-w-32 rounded-xl border border-gray-200 bg-white px-2 text-ink"
      @change="
        setLocale(($event.target as HTMLSelectElement).value as 'en' | 'vi')
      "
    >
      <option value="en">English</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  </label>
</template>
