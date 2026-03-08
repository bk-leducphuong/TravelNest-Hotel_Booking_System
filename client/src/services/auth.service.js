import http from './http';

export const AuthService = {
  checkSession() {
    return http.get('/auth/session');
  },
  login(credentials) {
    return http.post('/auth/sessions', credentials);
  },
  logout() {
    return http.delete('/auth/sessions');
  },
  checkEmail(data) {
    return http.post('/auth/email/check', data);
  },
  register(userData) {
    return http.post('/auth/users', userData);
  },
  forgotPassword(data) {
    return http.post('/auth/password/forgot', data);
  },
  resetPassword(data) {
    return http.post('/auth/password/reset', data);
  },
  loginWithGoogle() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/google`;
  },
  loginWithFacebook() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/facebook`;
  },
  loginWithTwitter() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/twitter`;
  },
  loginWithSocialProvider(provider) {
    return http.get(`/auth/login-${provider}`);
  },
  loginAdmin(credentials) {
    return http.post('/auth/admin/sessions', credentials);
  },
  registerAdmin(userData) {
    return http.post('/auth/admin/users', userData);
  },
  sendSmsOtp(data) {
    return http.post('/auth/otp/sms', data);
  },
  verifySmsOtp(data) {
    return http.post('/auth/otp/verify', data);
  },
};

