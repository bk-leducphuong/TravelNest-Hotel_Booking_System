<script>
import TheHeader from '@/components/Header.vue'
export default {
  components: {
    TheHeader
  }
}
</script>
<template>
  <TheHeader :is-search-open="false" />
  <div class="container">
    <h1>Cài đặt tài khoản</h1>
    <p>Quản lý trải nghiệm Booking.com của bạn</p>
    <div class="feature-container">
      <div class="feature" @click="$router.push('/account-settings/personal-information')">
        <div class="icon">+</div>
        <h2>Thông tin cá nhân</h2>
        <p>Cập nhật thông tin của bạn và tìm hiểu các thông tin này được sử dụng ra sao.</p>
        <a>Quản lý thông tin cá nhân</a>
      </div>
      <div class="feature" @click="$router.push('/account-settings/general-settings')">
        <div class="icon">+</div>
        <h2>Cài đặt chung</h2>
        <p>Cá nhân hóa tài khoản để phù hợp với nhu cầu của bạn.</p>
        <a>Quản lý tùy chọn</a>
      </div>
      <div class="feature" @click="$router.push('/account-settings/security-settings')">
        <div class="icon">+</div>
        <h2>Cài đặt bảo mật</h2>
        <p>Thay đổi thiết lập bảo mật, cài đặt xác thực bổ sung hoặc xóa tài khoản của bạn.</p>
        <a>Quản lý bảo mật tài khoản</a>
      </div>
      <div class="feature" @click="$router.push('/account-settings/privacy-settings')">
        <div class="icon">+</div>
        <h2>Quản lý quyền riêng tư và dữ liệu</h2>
        <p>Thực hiện quyền riêng tư, kiểm soát dữ liệu hoặc trích xuất thông tin của bạn.</p>
        <a>Quản lý quyền riêng tư</a>
      </div>
      <div class="feature" @click="$router.push('/account-settings/email-settings')">
        <div class="icon">+</div>
        <h2>Cài đặt email</h2>
        <p>Chọn những gì được thông báo đến bạn và tất cả các thông báo không cần thiết.</p>
        <a>Quản lý thông báo</a>
      </div>
      <div class="feature" @click="$router.push('/account-settings/payment-settings')">
        <div class="icon">+</div>
        <h2>Phương thức thanh toán</h2>
        <p>Thêm hoặc bớt các phương thức thanh toán một cách dễ dàng hơn.</p>
        <a>Quản lý thông tin thanh toán</a>
      </div>
    </div>
  </div>
</template>
<style scoped>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

.container {
  /* max-width: 800px; */
  margin: 0 auto;
  padding: 40px;
}

h1 {
  font-size: 32px;
  margin-bottom: 10px;
}

p {
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
}

.feature-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 30px;
}

.feature {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  cursor: pointer;
}

.feature:hover {
  border: 2px solid #007bff;
}

.feature .icon {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 10px;
}

.feature h2 {
  font-size: 20px;
  margin-bottom: 10px;
}

.feature p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.feature a {
  color: #007bff;
  text-decoration: none;
}

.feature a:hover {
  text-decoration: underline;
}
</style>
