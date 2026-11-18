import apiClient from './api';
import { User } from '../types/auth';

export interface LoginResponseData {
  user: User;
  message: string;
  token: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponseData> {
    const response = await apiClient.post<LoginResponseData>('/auth/login', {
      username,
      password,
    });
    if (response.data.token) {
      sessionStorage.setItem('delgone_session_token', response.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      sessionStorage.removeItem('delgone_session_token');
    }
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data.message;
  },
};
