import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/healthService';
import { HealthState } from '../types/health';

export function useApiHealth() {
  const [state, setState] = useState<HealthState>({
    data: null,
    loading: true,
    error: null,
    latencyMs: null,
    lastChecked: null,
  });

  const checkHealth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, latencyMs } = await healthService.checkHealth();
      setState({
        data,
        loading: false,
        error: null,
        latencyMs,
        lastChecked: new Date(),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Backend unreachable';
      setState({
        data: null,
        loading: false,
        error: errorMsg,
        latencyMs: null,
        lastChecked: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Periodically verify health every 60 seconds
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { ...state, refetch: checkHealth };
}
