<script>
import { useToast } from 'vue-toastification'
import axios from 'axios'
export default {
  setup() {
    const toast = useToast()
    return { toast }
  },
  props: {
    withdrawAmount: {
      type: Number,
      required: true
    },
    withdrawTransactionId: {
      type: Number,
      required: true
    },
    hotelId: {
      type: Number,
      required: true
    }
  },
  methods: {
    async withdrawMoney() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/payout/create-payout`,
          {
            amount: this.withdrawAmount,
            transactionId: this.withdrawTransactionId,
            hotelId: this.hotelId
          },
          {
            withCredentials: true
          }
        )

        // this.toast.success('Withdrawal successful!')
        setTimeout(() => {
           this.$emit('close')
        }, 1000)
        
      } catch (error) {
        setTimeout(() => {
           this.$emit('close')
        }, 1000)
       
        this.toast.error(error.message)
        console.log(error)
        
      }
    }
  }
}
</script>
<template>
  <!-- Main Container -->
  <div id="withdrawPopup" class="popup-container">
    <div class="popup-content">
      <h2>Withdraw Money</h2>
      <p class="message">Are you sure you want to withdraw the following amount?</p>

      <!-- Bank Account Information -->
      <div class="info-section">
        <p><strong>Bank Account:</strong> **** **** **** 1234</p>
        <p><strong>Total Amount:</strong> {{ withdrawAmount }} VND</p>
        <p><strong>Transaction ID:</strong> {{ withdrawTransactionId }}</p>
      </div>

      <!-- Action Buttons -->
      <div class="buttons">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button class="confirm-btn" @click="withdrawMoney">Confirm</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* General Reset */
body {
  margin: 0;
  font-family: 'Arial', sans-serif;
  background-color: #f3f4f6;
}

/* Popup Container */
.popup-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* Popup Content */
.popup-content {
  background: #ffffff;
  width: 400px;
  padding: 20px 30px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.popup-content h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #333333;
}

.popup-content .message {
  font-size: 16px;
  color: #666666;
  margin-bottom: 20px;
}

/* Info Section */
.info-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.info-section p {
  font-size: 16px;
  color: #333333;
  margin: 5px 0;
}

.info-section p strong {
  font-weight: 600;
  color: #555555;
}

/* Buttons */
.buttons {
  display: flex;
  justify-content: space-between;
}

.cancel-btn,
.confirm-btn {
  font-size: 16px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #e0e0e0;
  color: #333333;
}

.cancel-btn:hover {
  background: #d6d6d6;
}

.confirm-btn {
  background: #0071c2;
  color: #ffffff;
}

.confirm-btn:hover {
  background: #005ea3;
}

</style>
