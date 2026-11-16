export interface HealthResponse {
  status: 'healthy' | 'degraded' | string;
  version: string;
  environment: string;
  database_connected: boolean;
  timezone: string;
  currency: string;
  timestamp: string;
}

export interface HealthState {
  data: HealthResponse | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
}
