<script setup lang="ts">
interface Segment {
  label: string;
  value: number;
  color: string;
}

const props = withDefaults(
  defineProps<{
    segments: Segment[];
    size?: number;
    centerLabel?: string;
    centerValue?: string;
  }>(),
  { size: 160 }
);

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const total = computed(() =>
  props.segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0)
);

const arcs = computed(() => {
  let offset = 0;
  return props.segments.map((segment) => {
    const value = Math.max(segment.value, 0);
    const fraction = total.value > 0 ? value / total.value : 0;
    const length = fraction * CIRCUMFERENCE;
    const arc = {
      ...segment,
      dasharray: `${length} ${CIRCUMFERENCE - length}`,
      dashoffset: -offset,
      percent: Math.round(fraction * 100),
    };
    offset += length;
    return arc;
  });
});
</script>

<template>
  <div class="flex items-center gap-6">
    <div
      class="relative flex-shrink-0"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <svg viewBox="0 0 100 100" :width="size" :height="size">
        <circle
          cx="50"
          cy="50"
          :r="RADIUS"
          fill="none"
          stroke="#e2e8f0"
          stroke-width="12"
        />
        <circle
          v-for="arc in arcs"
          :key="arc.label"
          cx="50"
          cy="50"
          :r="RADIUS"
          fill="none"
          :stroke="arc.color"
          stroke-width="12"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-xl font-semibold text-slate-900">{{
          centerValue
        }}</span>
        <span class="text-xs text-slate-400">{{ centerLabel }}</span>
      </div>
    </div>

    <ul class="space-y-1 text-sm">
      <li v-for="arc in arcs" :key="arc.label" class="flex items-center gap-2">
        <span
          class="inline-block h-3 w-3 rounded-sm"
          :style="{ backgroundColor: arc.color }"
        />
        <span class="text-slate-600">{{ arc.label }}</span>
        <span class="font-medium text-slate-900">{{ arc.percent }}%</span>
      </li>
    </ul>
  </div>
</template>
