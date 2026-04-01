<template>
  <div class="gallery-container">
    <!-- Featured large images -->
    <div class="featured-images">
      <div class="featured-left" @click="$emit('open-gallery')">
        <img
          v-if="hotelImages.length > 0"
          :src="getImageUrl(hotelImages[0]?.url)"
          :alt="hotelImages[0]?.filename || 'Hotel image'"
          class="featured-image"
        />
      </div>
      <div class="featured-right" @click="$emit('open-gallery')">
        <img
          v-if="hotelImages.length > 1"
          :src="getImageUrl(hotelImages[1]?.url)"
          :alt="hotelImages[1]?.filename || 'Hotel image'"
          class="featured-image"
        />
        <img
          v-if="hotelImages.length > 2"
          :src="getImageUrl(hotelImages[2]?.url)"
          :alt="hotelImages[2]?.filename || 'Hotel image'"
          class="featured-image"
        />
      </div>
    </div>

    <!-- Thumbnail grid -->
    <div class="thumbnail-grid">
      <div
        v-for="(image, index) in displayedThumbnails"
        :key="image.id"
        class="thumbnail-item"
        @click="$emit('open-gallery')"
      >
        <img
          :src="getImageUrl(image.url)"
          :alt="image.filename || `Room ${index + 4}`"
          class="thumbnail-image"
        />
      </div>
      <div v-if="hasMoreImages" class="thumbnail-item more-images" @click="$emit('open-gallery')">
        <div class="more-overlay">
          <span>+{{ remainingImages }} ảnh</span>
        </div>
        <img
          :src="getImageUrl(hotelImages[displayedThumbnails.length + 3]?.url)"
          :alt="`Room ${displayedThumbnails.length + 4}`"
          class="thumbnail-image"
        />
      </div>
    </div>
  </div>
</template>

<script>
  import { getImageUrl } from '@/utils/images';

  export default {
    name: 'HotelImages',
    props: {
      hotelImages: {
        type: Array,
        default: () => [],
      },
      initialThumbnailCount: {
        type: Number,
        default: 4,
      },
    },
    emits: ['open-gallery'],
    computed: {
      displayedThumbnails() {
        return this.hotelImages.slice(3, 3 + this.initialThumbnailCount);
      },
      hasMoreImages() {
        return this.hotelImages.length > 3 + this.initialThumbnailCount;
      },
      remainingImages() {
        return this.hotelImages.length - (3 + this.initialThumbnailCount);
      },
    },
    methods: {
      getImageUrl,
    },
  };
</script>

<style scoped>
  .gallery-container {
    padding-left: 0px !important;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .featured-images {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    height: 400px;
  }

  .featured-left {
    cursor: pointer;
    flex: 1;
  }

  .featured-right {
    cursor: pointer;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .featured-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .featured-right .featured-image {
    height: calc(50% - 10px);
  }

  .thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }

  .thumbnail-item {
    position: relative;
    aspect-ratio: 4/3;
    overflow: hidden;
    border-radius: 8px;
    cursor: pointer;
  }

  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .more-images {
    cursor: pointer;
  }

  .more-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .featured-images {
      flex-direction: column;
      height: auto;
    }

    .featured-right {
      flex-direction: row;
    }

    .featured-right .featured-image {
      height: 200px;
      width: calc(50% - 10px);
    }
  }
</style>
