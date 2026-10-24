<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { mediaImageUrl } from "~/utils/images";
const props = defineProps<{
  src?: string | null;
  alt: string;
  fallback?: string;
}>();
const config = useRuntimeConfig();
const source = computed(() =>
  mediaImageUrl(props.src, config.public.mediaBase)
);
const failed = ref(false);
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <div class="overflow-hidden bg-soft">
    <img
      v-if="source && !failed"
      :src="source"
      :alt="alt"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <div
      v-else
      class="flex h-full min-h-20 flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted"
      role="img"
      :aria-label="`${alt} · ${fallback || $t('rooms.photosFailed')}`"
    >
      <ImageOff :size="24" aria-hidden="true" />
      <span>{{ fallback || $t("rooms.photosFailed") }}</span>
    </div>
  </div>
</template>
