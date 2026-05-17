// src/services/http.js
import axios from 'axios'

const API_PREFIX = '/api/v1'
const configuredBaseURL = (import.meta.env.VITE_SERVER_HOST || '').replace(/\/$/, '')

export const apiBaseURL = configuredBaseURL.endsWith(API_PREFIX)
  ? configuredBaseURL
  : `${configuredBaseURL}${API_PREFIX}`

const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  withCredentials: true
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export default http
