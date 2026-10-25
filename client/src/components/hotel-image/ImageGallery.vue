<script>
  import MediaImage from '@/components/ui/MediaImage.vue';
  import { parseImageList, getImagePath } from '@/utils/images';
  export default {
    components: { MediaImage },
    props: {
      room_list: { type: Array, default: () => [] },
      hotelImages: { type: Array, default: () => [] },
      isOpenImageGallery: Boolean,
    },
    emits: ['close-image-gallery'],
    data() {
      return { selected: 0 };
    },
    computed: {
      currentImages() {
        return this.selected === 0
          ? this.hotelImages
          : parseImageList(
              this.room_list.find((room) => room.room_id === this.selected)?.room_image_urls
            ).map(getImagePath);
      },
    },
    methods: {
      selectRoom(room) {
        this.selected = room === 0 ? 0 : room.room_id;
      },
    },
  };
</script>
<template>
  <el-dialog
    :model-value="isOpenImageGallery"
    :title="$t('guest.photos')"
    width="960px"
    @close="$emit('close-image-gallery')"
  >
    <div class="gallery-tabs" :aria-label="$t('guest.photos')">
      <button
        type="button"
        class="guest-button guest-button-secondary"
        :aria-pressed="selected === 0"
        @click="selectRoom(0)"
      >
        {{ $t('gallery.overview') }}
      </button>
      <button
        v-for="room in room_list"
        :key="room.room_id"
        type="button"
        class="guest-button guest-button-secondary"
        :aria-pressed="selected === room.room_id"
        @click="selectRoom(room)"
      >
        {{ room.room_name }}
      </button>
    </div>
    <div class="gallery-images">
      <MediaImage
        v-for="(image, index) in currentImages"
        :key="image"
        :src="image"
        :alt="$t('guest.openPhoto', { count: index + 1 })"
      />
    </div>
    <p v-if="!currentImages.length">{{ $t('guest.noPhoto') }}</p>
  </el-dialog>
</template>
<style scoped>
  .gallery-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  .gallery-tabs [aria-pressed='true'] {
    background: var(--tn-soft);
    border-color: var(--tn-brand);
  }
  .gallery-images {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .gallery-images .guest-media {
    aspect-ratio: 4/3;
  }
  @media (max-width: 600px) {
    .gallery-images {
      grid-template-columns: 1fr;
    }
  }
</style>
