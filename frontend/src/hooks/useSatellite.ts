import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export function useSatelliteReadings(locationId: string, days = 30) {
  return useQuery({
    queryKey: ['satellite', locationId, days],
    queryFn: () => apiFetch(`/satellite/readings?locationId=${locationId}&days=${days}`),
    enabled: !!locationId,
    refetchInterval: 5 * 60_000,
  });
}

export function useSatelliteSummary(locationId: string) {
  return useQuery({
    queryKey: ['satellite-summary', locationId],
    queryFn: () => apiFetch(`/satellite/summary?locationId=${locationId}`),
    enabled: !!locationId,
  });
}
