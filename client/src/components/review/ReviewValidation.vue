<script>
import axios from 'axios'
import { useToast } from 'vue-toastification'

export default {
  setup() {
    const toast = useToast()
    return { toast }
  },
  props: {
    hotelId: {
      type: String,
      required: true
    },
    hotelName: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      bookingCode: null
    }
  },
  methods: {
    // validate user who booked the room before writing a review
    async validateUser() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/review/validate-review`,
          {
            bookingCode: this.bookingCode,
            hotelId: this.hotelId
          },
          {
            withCredentials: true
          }
        )
        if (response.data.success) {
          // this.toast.success('Đặt phòng đã được xác nhận!')
          this.$emit('close')
          this.$router.push({
            path: '/reviews/review-details',
            query: {
              bc: this.bookingCode,
              hid: this.hotelId,
              hn: this.hotelName
            }
          })
        }
      } catch (error) {
        this.$emit('close')
        this.toast.error('Không tìm thất mã đặt phòng này!')
      }
    }
  }
}
</script>
<template>
  <div class="popup">
    <div class="popup-content">
      <i class="fa fa-times close-btn" aria-hidden="true" @click="$emit('close')"></i>
      <h2>Nhập chi tiết đặt phòng của bạn</h2>
      <p>Vui lòng kiểm tra email xác nhận đặt phòng để tìm mã số đặt phòng và PIN</p>
      <form @submit.prevent="validateUser">
        <label for="room-number">Mã số đặt phòng</label>
        <input id="room-number" v-model="bookingCode" type="text" name="room-number" />
        <label for="pin">Mã PIN</label>
        <input id="pin" type="text" name="pin" />
        <button type="submit">Đánh giá ký nghị của bạn</button>
      </form>
    </div>
  </div>
</template>
<style scoped>
.popup {
  position: fixed;
  z-index: 99999999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.popup-content {
  position: relative;
  border-radius: 20px;
  background-color: #fefefe;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
}

.popup-content h2 {
  margin-top: 0;
  font-size: 20px;
}

.popup-content form {
  display: flex;
  flex-direction: column;
}

.popup-content input {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.popup-content button {
  background-color: #007bff;
  color: #fff;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 25px;
  cursor: pointer;
}
</style>
