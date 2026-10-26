<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { ChevronLeft, ChevronRight, LayoutGrid, Rows3 } from 'lucide-vue-next';

  const props = defineProps({
    title: { type: String, required: true },
    sectionKey: { type: String, required: true },
    items: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
  });
  const mode = ref('row');
  const visibleCount = ref(4);
  const track = ref(null);
  const canGoBack = ref(false);
  const canGoForward = ref(false);
  const storageKey = computed(() => `travelnest:discovery:${props.sectionKey}`);
  const visibleItems = computed(() =>
    mode.value === 'grid' ? props.items.slice(0, visibleCount.value) : props.items
  );
  let observer;

  function updateNavigation() {
    const el = track.value;
    canGoBack.value = !!el && el.scrollLeft > 1;
    canGoForward.value = !!el && el.scrollWidth - el.clientWidth - el.scrollLeft > 1;
  }
  function move(direction) {
    const el = track.value;
    if (!el) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }
  function setMode(value) {
    mode.value = value;
    visibleCount.value = 4;
    if (track.value) track.value.scrollLeft = 0;
    try {
      localStorage.setItem(storageKey.value, value);
    } catch {
      // Browsing still works when storage is unavailable.
    }
  }
  onMounted(() => {
    try {
      if (localStorage.getItem(storageKey.value) === 'grid') mode.value = 'grid';
    } catch {
      // Use the default layout when storage is unavailable.
    }
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateNavigation);
      observer.observe(track.value);
    }
    window.addEventListener('resize', updateNavigation);
    nextTick(updateNavigation);
  });
  watch([() => props.items.length, () => props.busy, mode], async () => {
    await nextTick();
    updateNavigation();
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener('resize', updateNavigation);
  });
</script>

<template>
  <section class="discovery-section" :aria-label="title" :aria-busy="busy">
    <div class="discovery-heading">
      <h2>{{ title }}</h2>
      <div v-if="items.length && !busy" class="discovery-controls">
        <div class="display-toggle" role="group" :aria-label="$t('guest.discovery.displayType')">
          <button type="button" :aria-pressed="mode === 'row'" @click="setMode('row')">
            <Rows3 :size="16" aria-hidden="true" />{{ $t('guest.discovery.row') }}
          </button>
          <button type="button" :aria-pressed="mode === 'grid'" @click="setMode('grid')">
            <LayoutGrid :size="16" aria-hidden="true" />{{ $t('guest.discovery.grid') }}
          </button>
        </div>
        <div v-if="mode === 'row' && (canGoBack || canGoForward)" class="row-navigation">
          <button
            type="button"
            :disabled="!canGoBack"
            :aria-label="$t('guest.discovery.previous', { section: title })"
            @click="move(-1)"
          >
            <ChevronLeft :size="20" aria-hidden="true" />
          </button>
          <button
            type="button"
            :disabled="!canGoForward"
            :aria-label="$t('guest.discovery.next', { section: title })"
            @click="move(1)"
          >
            <ChevronRight :size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
    <slot name="status" />
    <div
      v-show="!busy && items.length"
      ref="track"
      class="discovery-items"
      :class="`discovery-items--${mode}`"
      :tabindex="mode === 'row' ? 0 : undefined"
      role="group"
      :aria-label="title"
      @scroll.passive="updateNavigation"
      @keydown.right.self.prevent="move(1)"
      @keydown.left.self.prevent="move(-1)"
    >
      <slot :items="visibleItems" />
    </div>
    <div v-if="mode === 'grid' && items.length > 4 && !busy" class="grid-actions">
      <button
        v-if="visibleCount < items.length"
        type="button"
        class="guest-button guest-button-secondary"
        @click="visibleCount += 4"
      >
        {{ $t('guest.discovery.showMore') }}
      </button>
      <button
        v-if="visibleCount > 4"
        type="button"
        class="guest-button guest-button-secondary"
        @click="visibleCount = 4"
      >
        {{ $t('guest.showLess') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
  .discovery-heading,
  .discovery-controls,
  .display-toggle,
  .row-navigation,
  .grid-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .discovery-heading {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }
  .discovery-heading h2 {
    margin: 0;
  }
  .display-toggle {
    padding: 3px;
    border: 1px solid var(--tn-border);
    border-radius: 12px;
    background: white;
    gap: 2px;
  }
  .discovery-controls button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--tn-brand);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .display-toggle button[aria-pressed='true'] {
    background: var(--tn-brand);
    color: white;
  }
  .row-navigation button {
    min-width: 44px;
    border: 1px solid var(--tn-border);
    background: white;
    padding: 8px;
  }
  .discovery-controls button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button:focus-visible,
  .discovery-items:focus-visible {
    outline: 2px solid var(--tn-brand);
    outline-offset: 3px;
  }
  .discovery-items {
    gap: 20px;
  }
  .discovery-items--row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: calc((100% - 80px) / 4.2);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    padding: 4px 2px 12px;
    scrollbar-width: thin;
  }
  .discovery-items--row > :deep(*) {
    scroll-snap-align: start;
    min-width: 0;
  }
  .discovery-items--grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid-actions {
    justify-content: center;
    margin-top: 20px;
  }
  @media (max-width: 1023px) {
    .discovery-items--row {
      grid-auto-columns: calc((100% - 40px) / 2.2);
    }
    .discovery-items--grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 599px) {
    .discovery-items--row {
      grid-auto-columns: 85%;
      gap: 16px;
    }
    .discovery-items--grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
