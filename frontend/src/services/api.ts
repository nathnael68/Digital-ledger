import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // Enables HttpOnly cookie transmission across requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Support optional Bearer token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('delgone_session_token');
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Uniform error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let errorMessage = 'An unexpected network error occurred.';
    if (error.response?.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
      errorMessage = String((error.response.data as { detail: string }).detail);
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
