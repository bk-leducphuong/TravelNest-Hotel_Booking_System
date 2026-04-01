<script>
import { useToast } from 'vue-toastification'
import axios from 'axios'
import { mapGetters } from 'vuex'

export default {
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      isAddRoomOpened: false,
      isAddImageOpened: false,
      isMainFormOpened: true
      // isPaymentPopupOpened: false
    }
  },
  computed: {
    ...mapGetters('join', ['getJoinFormData', 'getUploadImage'])
  },
  methods: {
    // add image popup
    openAddImagePopup() {
      this.isMainFormOpened = false
      this.isAddImageOpened = true
    },
    closeAddImagePopup() {
      this.isAddImageOpened = false
      this.isMainFormOpened = true
      // this.uploadImage()
    },
    // add room popup
    openAddRoomPopup() {
      this.isMainFormOpened = false
      this.isAddRoomOpened = true
    },
    closeAddRoomPopup() {
      this.isAddRoomOpened = false
      this.isMainFormOpened = true
    },
    // establish payment method popup
    openPaymentPopup() {
      this.isPaymentPopupOpened = true
      this.isMainFormOpened = false
    },
    closePaymentPopup() {
      this.isPaymentPopupOpened = false
      this.isMainFormOpened = true
    },
    // payment method selection
    // chooseOnlinePayment() {
    //   if (!this.getJoinFormData.haveOnlinePayment) {
    //     this.getJoinFormData.haveOnlinePayment = true
    //     this.getJoinFormData.haveOfflinePayment = false
    //   }
    // },
    // chooseOfflinePayment() {
    //   if (!this.getJoinFormData.haveOfflinePayment) {
    //     this.getJoinFormData.haveOnlinePayment = false
    //     Object.keys(this.getJoinFormData.haveOnlinePayment).forEach(infor => {
    //       infor = null
    //     })

    //     this.getJoinFormData.haveOfflinePayment = true
    //   }
    // },
    // method for increasing and decreasing button
    increment(index) {
      this.getJoinFormData.bedOptions.map((bed) => {
        if (bed.index == index) {
          bed.quantity++
        }
      })
    },
    decrement(index) {
      this.getJoinFormData.bedOptions.map((bed) => {
        if (bed.index == index && bed.quantity > 0) {
          bed.quantity--
        }
      })
    },
    handleFiles(event) {
      const files = event.target.files
      this.getUploadImage.imageFiles = [...this.getUploadImage.imageFiles, ...files]

      // Iterate through each selected file
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        // Load the file and push its data URL to the previews array
        reader.onload = (e) => {
          this.getUploadImage.imagePreviews.push(e.target.result)
        }
        // Read file as Data URL
        reader.readAsDataURL(file)
      })
    },
    // upload image
    async uploadImage(hotel_id, room_id) {
      if (this.getUploadImage.imageFiles.length < 5) {
        this.toast.error('Bạn chưa chọn đủ số lượng ảnh!')
      }

      const formData = new FormData()
      this.getUploadImage.imageFiles.forEach((imageFile) => {
        formData.append('images', imageFile)
      })

      formData.append('hotel_id', hotel_id)
      formData.append('room_id', room_id)

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/join/upload-photos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          }
        )

        // response.data.success ? console.log('Upload successfully!') : console.log('Upload failed!')
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    },
    isFormComplete() {
      // Check if roomDetails are filled
      const isRoomDetailsComplete = Object.values(this.getJoinFormData.roomDetails).every(
        (value) => {
          if (typeof value === 'number') {
            return value > 0 // Check for positive numbers
          }
          return value !== null // Check for non-null values
        }
      )

      // Check if all bed options have quantity greater than 0
      const areBedOptionsComplete = this.getJoinFormData.bedOptions.some((bed) => bed.quantity > 0)

      // Check if there are any image previews
      const areImagesPresent = this.getUploadImage.imagePreviews.length >= 5

      // Combine all checks
      return isRoomDetailsComplete && areBedOptionsComplete && areImagesPresent
    },

    async finishJoinForm() {
      if (!this.isFormComplete()) {
        this.toast.error('Pls fill all the fields')
      } else {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/join`,
            {
              joinFormData: this.getJoinFormData,
            },
            {
              withCredentials: true
            }
          )
          if (response.data.success) {
            this.toast.success('Join form submitted successfully')
            await this.uploadImage(response.data.hotel_id, response.data.room_id)
            this.$router.replace('/admin/hotels-management')
          }
        } catch (error) {
          this.toast.error('Error submitting join form')
          console.log(error)
        }
      }
    }
  }
}
</script>
<template>
  <!--  form-6  -->
  <div class="form-6">
    <div class="card">
      <div v-if="isMainFormOpened" class="steps">
        <div class="stepss step-1">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <span>Bước 1</span>
            <br />
            <span>
              <h3>Thông tin chỗ nghỉ</h3>
            </span>
            <span
              >Các thông tin cơ bản. Nhập tên chỗ nghỉ, địa chỉ, tiện nghi và nhiều hơn nữa.</span
            >
          </div>
          <span>Hoàn thành</span>
        </div>
        <hr />
        <div class="stepss step-2">
          <i class="fa-solid fa-bed"></i>
          <div>
            <span>Bước 2</span>
            <br />
            <span>
              <h3>Phòng</h3>
            </span>
            <span
              >Hãy cho chúng tôi biết về phòng đầu tiên của Quý vị. Sau khi đã thiết lập xong một
              căn, Quý vị có thể thêm nhiều căn nữa.</span
            >
          </div>
          <button id="addRoom" @click="openAddRoomPopup">Thêm phòng</button>
        </div>
        <hr />
        <div class="stepss step-3">
          <i class="fa-solid fa-image"></i>
          <div>
            <span>Bước 3</span>
            <br />
            <span>
              <h3>Ảnh</h3>
            </span>
            <span
              >Chia sẻ một số hình ảnh chỗ nghỉ của Quý vị để khách biết mình nên có những kỳ vọng
              gì.</span
            >
          </div>
          <button id="conkac" @click="openAddImagePopup()">Thêm ảnh</button>
        </div>
        <hr />
        <!-- <div class="stepss step-4">
          <i class="fa-solid fa-clipboard-list"></i>
          <div>
            <span>Bước 4</span>
            <br />
            <span>
              <h3>Những bước cuối cùng</h3>
            </span>
            <span>Nhập thông tin thanh toán và hóa đơn trước khi mở để nhận đặt phòng.</span>
          </div>
          <a @click="openPaymentPopup" style="font-weight: bold; color: #0056b3">Thêm</a>
        </div> -->
        <br />
        <div class="form-button-container">
          <button type="button" class="previous" @click="$emit('previous')">Quay lại</button>
          <button
            style="
              font-weight: bold;
              font-size: 16px;
              color: #0056b3;
              background-color: #fff;
              border: 1px solid #0056b3;
            "
            type="submit"
            class="next"
            @click="finishJoinForm"
          >
            Lưu thông tin
          </button>
        </div>
      </div>

      <!-- add image popup -->
      <div v-if="isAddImageOpened" class="step-image">
        <form action="">
          <h3>Khách sạn của Quý vị trông ra sao</h3>
          <p>
            <strong>Đăng tải ít nhất 5 ảnh.</strong> Càng đăng nhiều, Quý vị càng có cơ hội nhận đặt
            phòng. Quý vị có thể thêm ảnh sau.
          </p>
          <div id="dropZone" class="upload-container">
            <i class="fa-regular fa-image"></i>
            <h3>Kéo và thả hoặc</h3>
            <label class="upload-button" for="fileInput">
              <span>Đăng tải ảnh</span>
            </label>
            <input
              id="fileInput"
              type="file"
              accept="image/jpeg, image/png"
              multiple
              @change="handleFiles"
            />
            <p>jpg/jpeg hoặc png, tối đa 47MB mỗi file</p>
          </div>
        </form>
        <button class="back1" @click="closeAddImagePopup">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <br />
        <div id="preview">
          <img
            v-for="(preview, index) in getUploadImage.imagePreviews"
            :key="index"
            :src="preview"
            alt="Image preview"
            class="preview-image"
          />
          <br />
        </div>
      </div>
      <!-- end add image popup -->

      <!-- add room popup -->
      <div v-if="isAddRoomOpened" class="container1">
        <h2>Chi tiết phòng</h2>

        <div class="section">
          <label>Đây là loại chỗ nghỉ gì?</label>
          <select v-model="getJoinFormData.roomDetails.roomType">
            <option value="Phòng giường đôi">Phòng giường đôi</option>
            <option value="Phòng giường đơn">Phòng giường đơn</option>
            <option value="Phòng gia đình">Phòng gia đình</option>
            <!-- Thêm các tùy chọn khác nếu cần -->
          </select>
        </div>

        <div class="section">
          <label>Quý vị có bao nhiêu phòng loại này?</label>
          <input
            v-model="getJoinFormData.roomDetails.numberOfRooms"
            type="number"
            value="1"
            min="1"
          />
        </div>

        <div class="section">
          <label>Có loại giường nào trong phòng này?</label>
          <div v-for="(bed, index) in getJoinFormData.bedOptions" :key="index" class="bed-option">
            <span
              ><i class="fa-solid fa-bed"></i>{{ bed.name }}<br /><small
                >Rộng {{ bed.width }} cm</small
              ></span
            >
            <div class="counter">
              <button @click="decrement(index)">-</button>
              <input type="text" :value="bed.quantity" readonly />
              <button @click="increment(index)">+</button>
            </div>
          </div>
          <div class="add-option">
            <i class="fa-solid fa-arrow-down"></i> Thêm các lựa chọn giường
          </div>
          <div class="erase-option"><i class="fa-solid fa-arrow-up"></i> Thu gọn các lựa chọn</div>
          <div class="bed-option erase">
            <span
              ><i class="fa-solid fa-bed"></i> Giường tầng<br /><small>Nhiều kích cỡ</small></span
            >
            <div class="counter">
              <button onclick="decrement(this)">-</button>
              <input type="text" value="0" readonly />
              <button onclick="increment(this)">+</button>
            </div>
          </div>
          <div class="bed-option erase">
            <span
              ><i class="fa-solid fa-couch"></i> Giường sofa<br /><small>Nhiều kích cỡ</small></span
            >
            <div class="counter">
              <button onclick="decrement(this)">-</button>
              <input type="text" value="0" readonly />
              <button onclick="increment(this)">+</button>
            </div>
          </div>
          <div class="bed-option erase">
            <span
              ><i class="fa-solid fa-couch"></i> Nệm futon<br /><small>Nhiều kích cỡ</small></span
            >
            <div class="counter">
              <button onclick="decrement(this)">-</button>
              <input type="text" value="0" readonly />
              <button onclick="increment(this)">+</button>
            </div>
          </div>
          <br />
          <div>
            <label>Có bao nhiêu khách có thể nghỉ ở phòng này</label>
            <div class="number-guest">
              <input v-model="getJoinFormData.roomDetails.numberOfGuests" type="number" min="1" />
            </div>
            <label>Phòng này rộng bao nhiêu</label>
            <div class="area-room">
              <input v-model="getJoinFormData.roomDetails.roomArea" type="number" min="1" />
              <select>
                <option value="">mét vuông</option>
                <option value="">feet vuông</option>
              </select>
            </div>

            <label for="">Có được hút thuốc trong phòng này không?</label>
            <span style="margin-right: 10px"
              ><input
                v-model="getJoinFormData.roomDetails.allowSmoke"
                type="radio"
                name="smoking"
                value="yes"
                style="margin-right: 3px"
              />
              Có</span
            >
            <span
              ><input
                v-model="getJoinFormData.roomDetails.allowSmoke"
                type="radio"
                name="smoking"
                value="no"
                style="margin-right: 3px"
              />
              Không</span
            >
            <br />
            <button
              id="save"
              style="margin-top: 10px; padding: 10px 20px"
              @click="closeAddRoomPopup"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
      <!-- end add room popup -->

      <!-- establish payment method -->
      <!-- <div class="container1" v-if="isPaymentPopupOpened">
        <div class="popup-header">
          <h2>Choose Payment Method</h2>
          <p>Select how you'd like to pay for your property listing</p>
        </div>
        <div class="payment-options">
         
          <div class="payment-option" :class="{selected: getJoinFormData.haveOnlinePayment}">
            <div class="option-header">
              <input type="radio" name="payment-method" id="online" @click="chooseOnlinePayment"/>
              <label class="option-title" for="online">Pay Online</label>
              <div class="card-icons">
                <div class="card-icon">
                  <img src="../../assets/icons/visa.png" alt="Visa" />
                </div>
                <div class="card-icon">
                  <img src="../../assets/icons/card.png" alt="Mastercard" />
                </div>
              </div>
            </div>
            <div class="card-form" v-if="getJoinFormData.haveOnlinePayment">
              <div class="form-row">
                <label for="card-number">Card Number</label>
                <input type="text" id="card-number" placeholder="1234 5678 9012 3456" v-model="getJoinFormData.onlinePaymentMethodInfor.cardNumber"/>
              </div>
              <div class="form-row">
                <label for="card-name">Cardholder Name</label>
                <input type="text" id="card-name" placeholder="John Doe" v-model="getJoinFormData.onlinePaymentMethodInfor.cardHolderName"/>
              </div>
              <div class="card-details">
                <div class="form-row">
                  <label for="expiry">Expiry Date</label>
                  <input type="text" id="expiry" placeholder="MM/YY" v-model="getJoinFormData.onlinePaymentMethodInfor.expiryDate"/>
                </div>
                <div class="form-row">
                  <label for="cvv">CVC</label>
                  <input type="text" id="cvv" placeholder="123" v-model="getJoinFormData.onlinePaymentMethodInfor.CVC" />
                </div>
              </div>
            </div>
          </div>

          
          <div class="payment-option" :class="{selected: getJoinFormData.haveOfflinePayment}">
            <div class="option-header">
              <input type="radio" name="payment-method" id="offline" @click="chooseOfflinePayment"/>
              <label class="option-title" for="offline">Pay Offline</label>
            </div>
            <p style="color: #666; font-size: 14px; margin: 0">
              Make payment at our office location. Our staff will assist you with the process.
            </p>
          </div>

          <div class="popup-buttons">
            <button class="btn btn-cancel" @click="closePaymentPopup">Cancel</button>
            <button class="btn btn-confirm" @click="closePaymentPopup">Confirm Payment</button>
          </div>
        </div>
      </div> -->
    </div>
  </div>

  <!-- end form-6  -->
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
  justify-content: space-between;
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
/* form-6 */
h3 {
  font-size: 19px !important;
}

.form-6 {
  overflow-x: hidden !important;
}

.card {
  max-width: 600px;
}

.steps .stepss {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.steps .stepss i {
  font-size: 30px;
  width: 8%;
  text-align: center;
}
.steps .step-1 i {
  font-size: 30px;
  color: green;
}
.steps .stepss div span h3 {
  margin-bottom: 0;
}

.steps .stepss div {
  margin-right: 5px;
  width: 70%;
}

.steps .stepss a {
  width: 15%;
  display: inline-block;
  text-align: center;
}
.steps .stepss strong {
  width: 15%;
  display: inline-block;
  text-align: center;
  color: #777;
  cursor: not-allowed;
}
.step-2 button {
  width: 15%;
  display: inline-block;
  text-align: center;
  color: #fff;
  background-color: #0066ff;
  border-radius: 5px;
  padding: 10px;
  border: none;
  font-weight: 600;
  font-size: 15px;
}

.step-2 button:hover {
  background-color: #0358d7;
  cursor: pointer;
}

.step-3 button {
  width: 15%;
  display: inline-block;
  text-align: center;
  color: #0066ff;
  border: 1px solid #0066ff;
  border-radius: 5px;
  padding: 10px;
  font-weight: 600;
  font-size: 15px;
  background-color: #fff;
  cursor: pointer;
}

.step-3 button:hover {
  background-color: #0066ff16;
}

#preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-width: 100%;
}

#preview img {
  margin-top: 20px;
  width: 100%;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
}

.upload-container {
  border: 2px dashed #bbb;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin: 0 auto;
  color: #555;
}

.upload-container img {
  width: 80px;
  height: auto;
  margin-bottom: 10px;
}

.upload-container .upload-button {
  display: inline-block;
  margin-top: 10px;
  padding: 10px 20px;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.upload-container .upload-button:hover {
  background-color: #0056b3;
}

.upload-container p {
  font-size: 14px;
  color: #888;
}

#fileInput {
  display: none;
}

.step-image .back1 {
  display: inline-block;
  text-align: center;
  color: #fff;
  background-color: #0066ff;
  border-radius: 5px;
  padding: 10px 20px;
  font-weight: 600;
  font-size: 20px;
  cursor: pointer;
  margin-top: 10px;
}
.step-image .back1:hover {
  background-color: #fff;
  color: #0066ff;
  border: 1px solid #0066ff;
}

.section {
  margin-bottom: 20px;
}
label {
  display: block;
  margin-bottom: 5px;
}
select,
input[type='number'] {
  width: 100%;
  padding: 5px;
  margin-bottom: 10px;
}
.bed-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
}
.bed-option span {
  flex: 1;
}
.counter {
  display: flex;
  align-items: center;
}
.counter button {
  font-size: 18px;
}
.counter input {
  width: 40px;
  text-align: center;
  border: none;
}
.add-option {
  color: blue;
  cursor: pointer;
}

button {
  display: inline-block;
  text-align: center;
  color: #0066ff;
  border: 1px solid #0066ff;
  border-radius: 5px;
  padding: 6px 12px;
  font-weight: 600;
  font-size: 15px;
  background-color: #fff;
  text-align: center;
  cursor: pointer;
}

button:hover {
  background-color: #0066ff1f;
}

.bed-option:focus span {
  font-weight: bold;
}
.erase,
.erase-option {
  display: none;
}

.erase-option {
  color: #0056b3;
  cursor: pointer;
}

.area-room {
  display: flex;
}

.area-room input {
  max-width: 50%;
}

.area-room select {
  flex: 1;
}

.bed-option span {
  font-size: 20px;
}

label {
  font-size: 20px;
}

/* end form-6 */

/* establish payment method */
/* Header styles */
.popup-header {
  text-align: center;
  margin-bottom: 30px;
}

.popup-header h2 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.popup-header p {
  color: #7f8c8d;
  margin: 10px 0 0;
  font-size: 14px;
}

/* Payment options */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-option {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.payment-option:hover {
  border-color: #003b95;
  background: #f8f9fa;
}

.payment-option.selected {
  border-color: #003b95;
  background: #f0f7ff;
}

.option-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.option-header input[type='radio'] {
  margin-right: 15px;
}

.option-title {
  flex-grow: 1;
  font-weight: 600;
  color: #2c3e50;
}

.card-icons {
  display: flex;
  gap: 10px;
}

.card-icon {
  width: 40px;
  height: 25px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon img {
  width: -webkit-fill-available;
}

/* Card form */
.card-form {
  margin-top: 15px;
  display: none;
}

.selected .card-form {
  display: block;
}

.form-row {
  margin-bottom: 15px;
}

.form-row label {
  display: block;
  margin-bottom: 5px;
  color: #2c3e50;
  font-size: 14px;
}

.form-row input {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.card-details {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 15px;
}

/* Buttons */
.popup-buttons {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.btn {
  padding: 12px 25px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background: #f8f9fa;
  border: 1px solid #dcdfe6;
  color: #606266;
}

.btn-cancel:hover {
  background: #f2f2f2;
}

.btn-confirm {
  background: #003b95;
  border: none;
  color: white;
}

.btn-confirm:hover {
  background: #003b95;
}

/* Responsive design */
@media (max-width: 480px) {
  .payment-popup {
    padding: 20px;
  }

  .card-details {
    grid-template-columns: 1fr;
  }

  .popup-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
