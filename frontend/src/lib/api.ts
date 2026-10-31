import axios from 'axios';
import { closeSocket } from './socket';
import { resolveApiUrl } from './apiUrl';

const API_URL = resolveApiUrl();

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const url: string = error.config?.url ?? '';
      const isAuthAttempt = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/register-driver',
      ].some((path) => url.includes(path));

      if (!isAuthAttempt) {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
        closeSocket();
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
