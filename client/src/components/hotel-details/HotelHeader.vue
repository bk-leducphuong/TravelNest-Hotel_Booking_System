<template>
  <div class="hotel-header">
    <div class="hotel-header__title">
      <h2>{{ hotel.name }}</h2>
      <button @click="$emit('book')">Đặt ngay</button>
    </div>
    <div class="hotel-header__location">
      <p>
        <i class="fa-solid fa-location-dot"></i>
        {{ hotel.address }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HotelHeader',
  props: {
    hotel: {
      type: Object,
      required: true
    }
  },
  emits: ['book']
}
</script>

<style scoped>
.hotel-header__title {
  display: flex;
  justify-content: space-between;
  padding: 0 0 10px 0;
}

.hotel-header__title button {
  color: #fff;
  background-color: #0056b3;
  font-weight: 500;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  padding: 0 15px;
}

.hotel-header__title h2 {
  margin: 0px;
}

.hotel-header__location i {
  color: #0056b3;
}
</style>
