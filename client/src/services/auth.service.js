import http, { apiBaseURL } from './http';

export const AuthService = {
  checkSession() {
    return http.get('/auth/session');
  },
  getCsrfToken() {
    return http.get('/auth/csrf-token');
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

  loginWithGoogle() {
    window.location.href = `${apiBaseURL}/auth/google`;
  },
  loginWithFacebook() {
    return Promise.reject(new Error('Facebook OAuth is not available in the backend API'));
  },
  loginWithTwitter() {
    window.location.href = `${apiBaseURL}/auth/twitter`;
  },

  loginAdmin(credentials) {
    return http.post('/auth/sessions', credentials);
  },
  registerAdmin(userData) {
    return http.post('/auth/users', userData);
  },
};
