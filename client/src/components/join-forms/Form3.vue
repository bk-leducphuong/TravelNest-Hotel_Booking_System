<script>
import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  data() {
    return {}
  },
  computed: {
    ...mapGetters('join', ['getJoinFormData']),
    checkForNext() {
      return this.getJoinFormData.services.length != 0 ? true : false
    }
  },
  methods: {
    goNext() {
      this.$emit('next')
    }
  }
}
</script>
<template>
  <form class="multi-step-form">
    <div class="card">
      <div class="question">
        <h3 class="title">Khách có thể sử dụng gì tại khách sạn của Quý vị?</h3>
      </div>
      <div class="facilities-group">
        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="restaurant"
          />
          <span class="checkbox-custom"></span>
          <span>Nhà hàng</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="room-service"
          />
          <span class="checkbox-custom"></span>
          <span>Dịch vụ phòng</span>
        </label>

        <label class="facility-item">
          <input v-model="getJoinFormData.services" type="checkbox" name="facilities" value="bar" />
          <span class="checkbox-custom"></span>
          <span>Quầy bar</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="24h-service"
          />
          <span class="checkbox-custom"></span>
          <span>Lễ tân 24 giờ</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="sauna"
          />
          <span class="checkbox-custom"></span>
          <span>Phòng xông hơi</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="fitness"
          />
          <span class="checkbox-custom"></span>
          <span>Trung tâm thể dục</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="garden"
          />
          <span class="checkbox-custom"></span>
          <span>Sân vườn</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="terrace"
          />
          <span class="checkbox-custom"></span>
          <span>Sân thượng / hiên</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="non-smoking"
          />
          <span class="checkbox-custom"></span>
          <span>Phòng không hút thuốc</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="airport-shuttle"
          />
          <span class="checkbox-custom"></span>
          <span>Xe đưa đón sân bay</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="family-room"
          />
          <span class="checkbox-custom"></span>
          <span>Phòng gia đình</span>
        </label>

        <label class="facility-item">
          <input v-model="getJoinFormData.services" type="checkbox" name="facilities" value="spa" />
          <span class="checkbox-custom"></span>
          <span>Trung tâm Spa & chăm sóc sức khỏe</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="jacuzzi"
          />
          <span class="checkbox-custom"></span>
          <span>Bồn tắm nóng/bể sục (Jacuzzi)</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="free-wifi"
          />
          <span class="checkbox-custom"></span>
          <span>WiFi miễn phí</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="air-conditioning"
          />
          <span class="checkbox-custom"></span>
          <span>Điều hòa nhiệt độ</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="water-park"
          />
          <span class="checkbox-custom"></span>
          <span>Công viên nước</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="ev-station"
          />
          <span class="checkbox-custom"></span>
          <span>Trạm sạc xe điện</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="pool"
          />
          <span class="checkbox-custom"></span>
          <span>Hồ bơi</span>
        </label>

        <label class="facility-item">
          <input
            v-model="getJoinFormData.services"
            type="checkbox"
            name="facilities"
            value="beach"
          />
          <span class="checkbox-custom"></span>
          <span>Bãi biển</span>
        </label>
      </div>
      <div class="form-button-container">
        <button type="button" class="previous" @click="$emit('previous')">Quay lại</button>
        <button type="button" class="next" :disabled="!checkForNext" @click="goNext">
          Tiếp tục
        </button>
      </div>
    </div>
  </form>
</template>
<style scoped>
.card {
  background-color: white;
  border: none;
  border-radius: 0.5rem;
  max-width: 500px;
  margin: 0 auto;
  animation: fade 250ms ease-in-out forwards;
  border-radius: 8px;
  padding: 35px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  animation: slide 250ms 125ms ease-in-out both;
}

.next {
  background-color: #0358d7;
  color: white;
  border: none;
  padding-left: 70px;
  padding-right: 70px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
}

.next:hover {
  background-color: #003b95;
}

.next:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
}

.previous {
  background-color: #0358d7;
  color: white;
  border: none;
  padding-left: 70px;
  padding-right: 70px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
}

.previous:hover {
  background-color: #003b95;
}

.previous:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 30px;
  gap: 0px;
}

.form-group:last-child {
  margin: 0;
}

.form-group > label {
  font-weight: bold;
  font-size: 0.8em;
  color: #333;
}

.form-group > input {
  border: 1px solid #333;
  border-radius: 0.25em;
  font-size: 1rem;
  padding: 0.25em;
}
.form-group:nth-child(3n) {
  display: flex;
  align-items: baseline;
}
.step-title {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
}
.title {
  font-size: 28px;
  margin-bottom: 40px;
  font-weight: bold;
}
.sub-title {
  margin-top: 6px;
  font-size: 12px;
}
.divider {
  border: none;
  border-top: 1px solid #e7e7e7;
  margin: 0;
}
.card.active {
  animation: slide 250ms 125ms ease-in-out both;
}

.multi-step-form {
  overflow: hidden;
  position: relative;
  margin-top: 50px;
}

.hide {
  display: none;
}
.card .container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
.form-button-container {
  display: flex;
  flex-direction: row;
  gap: 25px;
}
.form-group .zip {
  align-items: baseline;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.radio-group {
  display: flex;
  align-items: center;
}

.radio-group input[type='radio'] {
  margin-right: 5px;
}

.radio-group label {
  margin-right: 10px;
  font-weight: normal;
}
.rating-form {
  font-family: Arial, sans-serif;
  max-width: 500px;
  padding: 20px;
}

.rating-form h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: normal;
}

.rating-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rating-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.rating-option input[type='radio'] {
  opacity: 0;
  position: absolute;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
}

.rating-option input[type='radio']:checked + .radio-custom::after {
  content: '';
  width: 12px;
  height: 12px;
  background: #0066ff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.rating-option input[type='radio']:checked + .radio-custom {
  border-color: #0066ff;
}

.label-text {
  margin-right: 10px;
  font-weight: lighter;
}

.stars {
  letter-spacing: 2px;
}

.rating-option input[type='radio']:focus + .radio-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}

.rating-option:hover .radio-custom {
  border-color: #0066ff;
}
.facilities-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2px;
  margin-bottom: 24px;
}

.facility-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.facility-item input[type='checkbox'] {
  opacity: 0;
  position: absolute;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
}

.facility-item input[type='checkbox']:checked + .checkbox-custom::after {
  content: '';
  width: 10px;
  height: 10px;
  background: #0066ff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 2px;
}

.facility-item input[type='checkbox']:checked + .checkbox-custom {
  border-color: #0066ff;
}

.facility-item:hover .checkbox-custom {
  border-color: #0066ff;
}

.facility-item input[type='checkbox']:focus + .checkbox-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}
.facilities-group span {
  font-weight: lighter;
}
.time-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.check-time > label {
  font-weight: bold;
  display: block;
}

.time-inputs {
  display: flex;
  gap: 20px;
}

.time-input {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sub-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
  order: -1; /* Đảm bảo label luôn ở trên */
}
.time-group label {
  font-size: 12px;
}
.time-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.radio-option input[type='radio'] {
  opacity: 0;
  position: absolute;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
}

.radio-option input[type='radio']:checked + .radio-custom::after {
  content: '';
  width: 12px;
  height: 12px;
  background: #0066ff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.radio-option input[type='radio']:checked + .radio-custom {
  border-color: #0066ff;
}

.radio-option:hover .radio-custom {
  border-color: #0066ff;
}

.radio-option input[type='radio']:focus + .radio-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}

@keyframes slide {
  0% {
    transform: translateX(200%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.75);
    opacity: 0;
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}
[data-next].disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgb(165, 165, 165);
  color: #4b4b4b;
}
</style>
