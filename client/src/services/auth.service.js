import http from './http';

export const AuthService = {
  // Session & core auth (v1 routes)
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

  // Password + OTP flows (keep legacy paths for now)
  forgotPassword(data) {
    return http.post('/api/auth/password/forgot', data);
  },
  resetPassword(data) {
    return http.post('/api/auth/password/reset', data);
  },

  // OAuth providers (redirect-based)
  loginWithGoogle() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/google`;
  },
  loginWithFacebook() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/facebook`;
  },
  loginWithTwitter() {
    window.location.href = `${import.meta.env.VITE_SERVER_HOST}/auth/twitter`;
  },

  // Admin helpers – use same session endpoint with admin role
  loginAdmin(credentials) {
    return http.post('/auth/sessions', credentials);
  },
  registerAdmin(userData) {
    return http.post('/auth/users', userData);
  },
};

