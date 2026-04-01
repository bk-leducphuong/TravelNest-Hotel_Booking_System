<template>
  <div class="hotel-information">
    <p>{{ description }}</p>
    <h3>Các tiện nghi được ưa chuộng nhất</h3>
    <ul class="amenities-list">
      <li v-for="amenity in displayedAmenities" :key="amenity.id">
        <i :class="amenity.icon || 'fa-solid fa-check'"></i>
        <p>{{ amenity.name }}</p>
      </li>
      <li v-if="displayedAmenities.length === 0">
        <i class="fa-solid fa-info-circle"></i>
        <p>Đang tải thông tin tiện nghi...</p>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'HotelInformation',
  props: {
    description: {
      type: String,
      default: ''
    },
    amenities: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    displayedAmenities() {
      const allAmenities = []
      for (const category in this.amenities) {
        if (this.amenities[category]) {
          allAmenities.push(...this.amenities[category])
        }
      }
      return allAmenities.slice(0, 7)
    }
  }
}
</script>

<style scoped>
.hotel-information {
  flex: 7;
  padding-right: 20px;
}

.amenities-list {
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.amenities-list li {
  display: flex;
  margin-right: 20px;
  width: 20%;
  margin-bottom: 5px;
  flex-wrap: nowrap;
  align-items: center;
}

.amenities-list li i {
  color: green;
  margin-right: 10px;
}

.amenities-list li p {
  margin: 0;
  font-size: 13px;
}
</style>
