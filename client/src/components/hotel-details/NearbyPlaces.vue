<template>
  <div class="nearby-places">
    <div class="sur__title">
      <div class="surrounding__name">
        <h3>Xung quanh khách sạn</h3>
        <a href="#" @click.prevent="$emit('show-map')">Vị trí tuyệt vời - Hiển thị bản đồ</a>
      </div>
      <div class="sur__button">
        <button @click="$emit('view-rooms')">Xem phòng trống</button>
      </div>
    </div>
    <div class="row">
      <div class="col-xl-4 col-md-6 col-12">
        <i class="fa-solid fa-person-walking"></i> <strong>Xung quanh có gì</strong>
        <div v-for="place in nearbyPlaces.slice(0, 10)" :key="place.id" class="sur__have">
          <div class="sur__have--item">
            <div class="sur__have--name">{{ place.name }}</div>
            <div class="sur__have--meters">{{ (place.distanceKm * 1000).toFixed(0) }} m</div>
          </div>
        </div>
      </div>
      <div class="col-xl-4 col-md-6 col-12">
        <i class="fa-solid fa-person-walking"></i> <strong></strong>
        <div class="sur__have">
          <div v-for="place in nearbyPlaces.slice(10, 20)" :key="place.id" class="sur__have--item">
            <div class="sur__have--name">{{ place.name }}</div>
            <div class="sur__have--meters">{{ (place.distanceKm * 1000).toFixed(0) }} m</div>
          </div>
        </div>
      </div>
      <div class="col-xl-4 col-md-6 col-12">
        <i class="fa-solid fa-person-walking"></i> <strong></strong>
        <div class="sur__have">
          <div v-for="place in nearbyPlaces.slice(20, 30)" :key="place.id" class="sur__have--item">
            <div class="sur__have--name">{{ place.name }}</div>
            <div class="sur__have--meters">{{ (place.distanceKm * 1000).toFixed(0) }} m</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NearbyPlaces',
  props: {
    nearbyPlaces: {
      type: Array,
      default: () => []
    }
  },
  emits: ['show-map', 'view-rooms']
}
</script>

<style scoped>
.nearby-places {
  margin-top: 40px;
}

.sur__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.surrounding__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.sur__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
  cursor: pointer;
}

.sur__have--item {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

.sur__have--item div {
  font-weight: 400;
  font-size: 13px;
}
</style>
