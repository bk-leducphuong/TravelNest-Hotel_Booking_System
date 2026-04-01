<template>
  <div class="hotel-policies">
    <div class="policy__title">
      <div class="policy__name">
        <h3>Chính sách</h3>
        <span>{{ hotelName }} nhận yêu cầu đặc biệt - gửi yêu cầu trong bước kế tiếp!</span>
      </div>
      <div class="policy__button">
        <button @click="$emit('view-rooms')">Xem phòng trống</button>
      </div>
    </div>
    <div class="policy__condition">
      <div
        v-for="policy in policies"
        :key="policy.id"
        class="policy__condition--total"
      >
        <div class="policy__condition--title">
          <i :class="policy.icon || 'fa-solid fa-circle-info'"></i>
          <strong>{{ policy.title }}</strong>
        </div>
        <div class="policy__condition--text">
          <p v-html="policy.description"></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HotelPolicies',
  props: {
    hotelName: {
      type: String,
      default: 'Khách sạn'
    },
    policies: {
      type: Array,
      default: () => []
    }
  },
  emits: ['view-rooms']
}
</script>

<style scoped>
.hotel-policies {
  margin: 40px 0px;
}

.policy__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.policy__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.policy__name {
  margin-bottom: 20px;
}

.policy__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
  cursor: pointer;
}

.policy__condition {
  border: 1px solid #ddd;
}

.policy__condition--total {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #dddd;
  padding: 20px 20px 20px 20px;
}

.policy__condition--title {
  padding-right: 40px;
  padding-left: 40px;
  width: 30%;
  display: flex;
  align-items: center;
}

.policy__condition--title i {
  margin-right: 10px;
}

.policy__condition--text {
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
}
</style>
