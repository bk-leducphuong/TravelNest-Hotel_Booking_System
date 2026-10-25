<script setup>
  import { computed, ref, watch } from 'vue';
  import { ImageOff } from 'lucide-vue-next';
  import { getImageUrl } from '@/utils/images';
  const props = defineProps({
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
  });
  const failed = ref(false);
  const url = computed(() => getImageUrl(props.src));
  watch(url, () => {
    failed.value = false;
  });
</script>
<template>
  <div class="guest-media">
    <img v-if="url && !failed" :src="url" :alt="alt" loading="lazy" @error="failed = true" />
    <div
      v-else
      class="guest-media-fallback"
      role="img"
      :aria-label="`${alt} · ${$t('guest.noPhoto')}`"
    >
      <ImageOff :size="28" aria-hidden="true" /><span>{{ $t('guest.noPhoto') }}</span>
    </div>
  </div>
</template>
