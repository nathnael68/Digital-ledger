import apiClient from './api';
import { HealthResponse } from '../types/health';

export const healthService = {
  async checkHealth(): Promise<{ data: HealthResponse; latencyMs: number }> {
    const startTime = performance.now();
    const response = await apiClient.get<HealthResponse>('/health');
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      data: response.data,
      latencyMs,
    };
  },
};
