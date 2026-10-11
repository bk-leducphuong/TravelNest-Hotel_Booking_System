<template>
  <div class="tn-skeleton-grid">
    <SkeletonCard v-for="n in count" :key="n" :image-height="imageHeight" />
  </div>
</template>

<script>
  import SkeletonCard from './SkeletonCard.vue';

  export default {
    name: 'SkeletonGrid',
    components: { SkeletonCard },
    props: {
      count: { type: Number, default: 4 },
      imageHeight: { type: String, default: '160px' },
    },
  };
</script>
