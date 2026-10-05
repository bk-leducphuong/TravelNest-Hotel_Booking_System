<template>
  <div class="tn-skeleton-card">
    <SkeletonBlock :height="imageHeight" radius="10px" />
    <SkeletonBlock width="75%" height="15px" />
    <SkeletonBlock width="50%" height="13px" />
  </div>
</template>

<script>
  import SkeletonBlock from './SkeletonBlock.vue';

  export default {
    name: 'SkeletonCard',
    components: { SkeletonBlock },
    props: {
      imageHeight: { type: String, default: '160px' },
    },
  };
</script>
