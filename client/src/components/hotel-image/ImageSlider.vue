<script>
export default {
    props: {
        images: {
            type: Array,
            required: true
        },
        isImageSliderOpen: {
            type: Boolean,
            required: true
        }
    },
    data() {
        return {
            currentImageIndex: 0
        }
    },
    methods: {
        nextImage() {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length
        },
        prevImage() {
            this.currentImageIndex =
                (this.currentImageIndex - 1 + this.images.length) % this.images.length
        },
        setImage(index) {
            this.currentImageIndex = index;
        },
        closePopup() {
            this.$emit('close-image-slider')
        }
    }
}
</script>
<template>
    <div v-if="isImageSliderOpen" class="image-slider-overlay" @click.self="closePopup">
        <div class="slider-popup">
            <button class="close-button" @click="closePopup">&times;</button>

            <div class="slider-content">
                <button class="prev-button" @click="prevImage">&#10094;</button>
                <div class="image-container">
                    <img :src="images[currentImageIndex]" alt="Image Slider" />
                </div>
                <button class="next-button" @click="nextImage">&#10095;</button>
            </div>

            <div class="image-list">
                <div class="image-indicator">{{ currentImageIndex + 1 }} / {{ images.length }}</div>
                <!-- Thumbnail List -->
                <div class="thumbnail-list">
                    <img
v-for="(image, index) in images" :key="index" :src="image"
                        :class="{ active: index === currentImageIndex }" class="thumbnail-image"
                        alt="Thumbnail" @click="setImage(index)" />
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.image-slider-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999999;
}

.slider-popup {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 80%;
    height: 553px;
    text-align: center;
    background: white;
    border-radius: 8px;
    overflow: hidden;
}

.close-button {
    position: absolute;
    top: 0px;
    right: 10px;
    font-size: 40px;
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 999;
}

.slider-content {
    position: relative;
    display: flex;
    align-items: center;
    /* justify-content: center; */
    justify-content: space-around;
    height: 75%;
}

.image-container {
    width: 600px;
    height: -webkit-fill-available;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 20px;
}

.image-list {
    height: 25%;
}

.prev-button,
.next-button {
    font-size: 50px;
    background: transparent;
    border: none;
    color: #333;
    cursor: pointer;
}

.image-indicator {
    padding: 10px;
    font-size: 16px;
}

.thumbnail-list {
    display: flex;
    gap: 5px;
    justify-content: center;
    overflow-x: auto;
    padding: 10px 0;
}

.thumbnail-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    cursor: pointer;
    border-radius: 5px;
    transition: transform 0.3s ease;
}

.thumbnail-image:hover {
    transform: scale(1.1);
}

.thumbnail-image.active {
    border: 2px solid #333;
}
</style>
