<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { mediaImageUrl } from "~/utils/images";
const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    fallback?: string;
    /** Icon-only fallback for avatars and thumbnails. */
    compact?: boolean;
  }>(),
  { src: null, fallback: "", compact: false }
);
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
      class="flex h-full w-full flex-col items-center justify-center text-center text-xs text-muted"
      :class="compact ? 'gap-0 p-0' : 'min-h-20 gap-2 p-3'"
      role="img"
      :aria-label="`${alt} · ${fallback || $t('rooms.photosFailed')}`"
    >
      <ImageOff :size="compact ? 16 : 24" aria-hidden="true" />
      <span v-if="!compact">{{ fallback || $t("rooms.photosFailed") }}</span>
    </div>
  </div>
</template>
