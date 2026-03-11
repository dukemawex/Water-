import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export interface SatelliteAverages {
  chlorophyllA?: number | null;
  turbidityDerived?: number | null;
  surfaceTemperature?: number | null;
  ndwi?: number | null;
}

export interface SatelliteSummary {
  sources: string[];
  averages: SatelliteAverages;
  totalDataPoints: number;
}

export function useSatelliteReadings(locationId: string, days = 30) {
  return useQuery({
    queryKey: ['satellite', locationId, days],
    queryFn: () => apiFetch(`/satellite/readings?locationId=${locationId}&days=${days}`),
    enabled: !!locationId,
    refetchInterval: 5 * 60_000,
  });
}

export function useSatelliteSummary(locationId: string) {
  return useQuery<SatelliteSummary>({
    queryKey: ['satellite-summary', locationId],
    queryFn: () => apiFetch<SatelliteSummary>(`/satellite/summary?locationId=${locationId}`),
    enabled: !!locationId,
  });
}
