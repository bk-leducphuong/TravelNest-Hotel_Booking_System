<script setup lang="ts">
interface Bar {
  label: string;
  value: number;
  color?: string;
}

const props = withDefaults(
  defineProps<{
    bars: Bar[];
    height?: number;
    valueFormatter?: (value: number) => string;
  }>(),
  { height: 160 }
);

const maxValue = computed(() =>
  Math.max(1, ...props.bars.map((bar) => bar.value))
);

const format = (value: number) =>
  props.valueFormatter ? props.valueFormatter(value) : String(value);

const barHeight = (value: number) =>
  `${Math.max((value / maxValue.value) * 100, value > 0 ? 4 : 0)}%`;
</script>

<template>
  <div class="flex items-end justify-around gap-4">
    <div
      v-for="bar in props.bars"
      :key="bar.label"
      class="flex flex-1 flex-col items-center gap-2"
    >
      <span class="text-xs font-medium text-slate-700">{{
        format(bar.value)
      }}</span>
      <div
        class="flex w-full items-end justify-center"
        :style="{ height: `${height}px` }"
      >
        <div
          class="w-10 rounded-t-md transition-all"
          :style="{
            height: barHeight(bar.value),
            backgroundColor: bar.color || '#059669',
          }"
        />
      </div>
      <span class="text-center text-xs text-slate-500">{{ bar.label }}</span>
    </div>
  </div>
</template>
