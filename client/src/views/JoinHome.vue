<script>
import LoginHeader from '@/components/LoginHeader.vue'
export default {
  components: {
    LoginHeader
  }
}
</script>

<template>
  <div class="join-container">
    <LoginHeader :is-admin-login="true" />
    <div class="main-container">
      <div class="left-main-container">
        <h1 class="main-title">
          Đăng<br />
          <span class="highlight">bất cứ chỗ nghỉ nào</span><br />
          trên TravelNest
        </h1>
        <h1 class="subtitle">
          Dù host là nghề tay trái hay công việc toàn thời gian, hãy đăng nhà của bạn ngay hôm nay
          và nhanh chóng có thêm nguồn thu nhập.
        </h1>
      </div>
      <div class="register-card">
        <h2 class="register-title">Đăng ký miễn phí</h2>
        <ul class="list">
          <li>45% host nhận được đơn đặt đầu tiên trong vòng 1 tuần</li>
          <li>Chọn một trong hai cách nhận đơn đặt: xác nhận tức thì và xem trước để duyệt</li>
          <li>Chúng tôi xử lý thanh toán thay bạn</li>
        </ul>
        <button class="get-started-button" @click="$router.push('/admin/login')">
          Bắt đầu ngay
        </button>
        <div class="login-text">
          Bạn đã bắt đầu quá trình đăng ký?
          <div>
            <a class="login-link">Tiếp tục các bước đăng ký</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.join-container {
  background-color: #003b95;
  padding-bottom: 100px;
}

/* main container */
.main-container {
  overflow: hidden;
  padding: 24px;
  margin: 100px 100px 0px 100px;
  height: 480px;
  width: auto;
  display: flex;
  justify-content: space-between;
  gap: 40px;
}
.main-container .left-main-container .main-title {
  font-size: 46px;
  color: white;
  line-height: 1.2;
  margin-bottom: 24px;
}
.main-container .left-main-container .main-title .highlight {
  color: #4a89ff;
}
.main-container .left-main-container {
  flex: 1;
  padding-right: 20px;
}
.main-container .left-main-container .subtitle {
  color: #ebf3ff;
  font-size: 22px;
  line-height: 28px;
  margin-top: 8px;
  padding-bottom: 8px;
  font-weight: 500;
}

/* ô đăng ký */
.register-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 380px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.register-title {
  font-size: 24px;
  color: #333;
  margin-bottom: 24px;
}

.list {
  list-style: none;
  margin-bottom: 24px;
}

.list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #333;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.4;
}

.list li::before {
  content: '✓';
  color: #008009;
  font-weight: bold;
}

.get-started-button {
  background: #006ce4;
  color: white;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.get-started-button::after {
  content: '→';
}
.get-started-button:hover {
  background: #13539d;
}

.login-text {
  font-size: 14px;
  color: #333;
}

.login-link {
  color: #006ce4;
  text-decoration: none;
  font-size: 14px;
}
/* hết ô đăng ký */

/* end main-container */
</style>
