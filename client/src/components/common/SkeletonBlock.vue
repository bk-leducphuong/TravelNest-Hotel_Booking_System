<template>
  <div class="tn-skeleton" :style="{ width, height, borderRadius: radius }"></div>
</template>

<script>
  export default {
    name: 'SkeletonBlock',
    props: {
      width: { type: String, default: '100%' },
      height: { type: String, default: '16px' },
      radius: { type: String, default: '8px' },
    },
  };
</script>
