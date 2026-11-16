import apiClient from './api';
import { User } from '../types/auth';
import {
  UserCreateInput,
  UserFilters,
  UserListResponse,
  UserPasswordResetInput,
  UserStatusInput,
  UserUpdateInput,
} from '../types/user';

export const userService = {
  async listUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const response = await apiClient.get<UserListResponse>(`/users?${params.toString()}`);
    return response.data;
  },

  async createUser(input: UserCreateInput): Promise<User> {
    const response = await apiClient.post<User>('/users', input);
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  async updateUser(id: string, input: UserUpdateInput): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, input);
    return response.data;
  },

  async toggleStatus(id: string, input: UserStatusInput): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/status`, input);
    return response.data;
  },

  async resetPassword(id: string, input: UserPasswordResetInput): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/users/${id}/reset-password`, input);
    return response.data;
  },
};
