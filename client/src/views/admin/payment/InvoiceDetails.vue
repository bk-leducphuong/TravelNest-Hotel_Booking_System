<script>
export default {
  props: {
    invoiceId: {
      type: String,
      required: true
    }
  },
   data() {
    return {
        
    }
   }, 
   mounted() {
    this.getHotelOwnerInformation()
    this.getBookingInformation()
    this.getBuyerInformation()
   },
   methods: {
    getHotelOwnerInformation() {
        //TODO: get hotel owner information
    },
    getBookingInformation() {
        //TODO: get booking information
    },
    getBuyerInformation() {
        //TODO: get buyer information
    }
   }
}
</script>
<template>
  <div class="invoice-container">
    <!-- Logo Section -->
    <div class="logo">
      <h2>TravelNest Invoice</h2>
    </div>

    <!-- Your Details Section -->
    <div class="section">
      <h3>Your Details</h3>
      <div class="details">
        <p><strong>Name:</strong>The Poppy Villa & Hotel</p>
        <p><strong>Email address:</strong>phuongtroc2004@gmail.com</p>
        <p><strong>Phone number:</strong>+84 123 456 789</p>
        <p><strong>Date:</strong> 30 Dec 2019</p>
      </div>
    </div>

    <!-- Booking Details Section -->
    <div class="section">
      <h3>Booking Details</h3>
      <div class="details">
        <p><strong>Property Name:</strong> Crowne Plaza Dubai</p>
        <p><strong>Property Address:</strong> Sheikh Zayed Road, Dubai, United Arab Emirates</p>
        <p><strong>Booking Number:</strong> 3832119096</p>
        <p><strong>Payment Reference:</strong> 68133-4SIBC</p>
        <p><strong>Check-in:</strong> Wednesday, 8 January 2020</p>
        <p><strong>Check-out:</strong> Friday, 10 January 2020</p>
        <p><strong>Amount Paid:</strong> ₹20,440.02</p>
      </div>
    </div>

    <!-- Footer Section -->
    <div class="footer">
      <p><em>Your receipt is automatically generated.</em></p>
      <p><em>This is proof of your transaction - it can't be used to claim VAT.</em></p>
    </div>
  </div>
</template>
<style scoped>
/* General Styles */
body {
  font-family: 'Roboto', Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f9fbfd;
}

.invoice-container {
  max-width: 700px;
  margin: 40px auto;
  padding: 30px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e7ec;
}

/* Header Styles */
.header {
  text-align: center;
  padding: 10px 0;
  border-bottom: 2px solid #f0f4f7;
  margin-bottom: 20px;
}

.header .header-content {
  font-size: 14px;
  color: #8a8d91;
}

.header h1 {
  font-size: 22px;
  color: #333333;
  font-weight: 600;
  margin-top: 5px;
}

/* Logo Section */
.logo {
  text-align: center;
  margin-bottom: 25px;
}

.logo h2 {
  font-size: 30px;
  font-weight: bold;
  color: #0071c2;
}

.logo h2 span {
  color: #ff6600;
}

/* Section Styles */
.section {
  margin-bottom: 30px;
}

.section h3 {
  font-size: 18px;
  color: #333333;
  font-weight: 600;
  border-bottom: 1px solid #ebeff3;
  padding-bottom: 8px;
  margin-bottom: 15px;
}

.details p {
  font-size: 16px;
  color: #555555;
  line-height: 1.6;
  margin: 5px 0;
}

.details p strong {
  font-weight: 600;
  color: #333333;
}

/* Footer Styles */
.footer {
  text-align: center;
  font-size: 14px;
  color: #8a8d91;
  border-top: 1px solid #f0f4f7;
  padding-top: 15px;
  margin-top: 20px;
}

.footer p {
  margin: 5px 0;
  font-style: italic;
}

/* Enhancements */
.invoice-container {
  animation: fadeIn 0.6s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
