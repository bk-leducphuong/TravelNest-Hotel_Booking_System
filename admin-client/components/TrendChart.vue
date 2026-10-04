<script setup lang="ts">
interface Point {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    points: Point[];
    height?: number;
    color?: string;
    valueFormatter?: (value: number) => string;
  }>(),
  { height: 180, color: "#059669" }
);

const WIDTH = 600;
const PAD = 14;

const maxValue = computed(() =>
  Math.max(1, ...props.points.map((point) => point.value))
);
const total = computed(() =>
  props.points.reduce((sum, point) => sum + point.value, 0)
);

const coordinates = computed(() => {
  const n = props.points.length;
  return props.points.map((point, index) => {
    const x = n <= 1 ? WIDTH / 2 : PAD + (index / (n - 1)) * (WIDTH - PAD * 2);
    const y =
      props.height -
      PAD -
      (point.value / maxValue.value) * (props.height - PAD * 2);
    return { x, y, ...point };
  });
});

const linePoints = computed(() =>
  coordinates.value.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")
);

const areaPoints = computed(() => {
  const c = coordinates.value;
  if (c.length === 0) return "";
  const base = props.height - PAD;
  const first = `${c[0].x.toFixed(1)},${base}`;
  const last = `${c[c.length - 1].x.toFixed(1)},${base}`;
  return `${first} ${linePoints.value} ${last}`;
});

const format = (value: number) =>
  props.valueFormatter ? props.valueFormatter(value) : String(value);

const firstLabel = computed(() => props.points[0]?.label ?? "");
const lastLabel = computed(
  () => props.points[props.points.length - 1]?.label ?? ""
);
</script>

<template>
  <div>
    <div class="mb-2 flex items-baseline justify-between">
      <span class="text-xs text-slate-400">peak {{ format(maxValue) }}</span>
      <span class="text-xs font-medium text-slate-500"
        >total {{ format(total) }}</span
      >
    </div>

    <svg
      :viewBox="`0 0 ${WIDTH} ${height}`"
      preserveAspectRatio="none"
      class="w-full"
      :style="{ height: `${height}px` }"
    >
      <line
        v-for="tick in [0.25, 0.5, 0.75]"
        :key="tick"
        x1="0"
        :y1="PAD + tick * (height - PAD * 2)"
        :x2="WIDTH"
        :y2="PAD + tick * (height - PAD * 2)"
        stroke="#e2e8f0"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <polygon :points="areaPoints" :fill="color" fill-opacity="0.12" />
      <polyline
        :points="linePoints"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div class="mt-1 flex justify-between text-xs text-slate-400">
      <span>{{ firstLabel }}</span>
      <span>{{ lastLabel }}</span>
    </div>
  </div>
</template>
