import apiClient from './api';
import { DashboardResponse } from '../types/dashboard';

export const dashboardService = {
  async getDashboard(): Promise<DashboardResponse> {
    const response = await apiClient.get<DashboardResponse>('/dashboard');
    return response.data;
  },
};
