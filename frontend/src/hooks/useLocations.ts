import { useQuery } from '@tanstack/react-query';
import { apiFetch, publicFetch } from '../services/api';
import type { PublicMapPin, LocationPublicSummary } from '@water-sentinel/shared';

export function useMapPins() {
  return useQuery<PublicMapPin[]>({
    queryKey: ['map-pins'],
    queryFn: () => publicFetch<PublicMapPin[]>('/public/map-data'),
    refetchInterval: 60_000,
  });
}

export function usePublicLocation(id: string) {
  return useQuery<LocationPublicSummary>({
    queryKey: ['public-location', id],
    queryFn: () => publicFetch<LocationPublicSummary>(`/public/location/${id}`),
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch('/locations'),
  });
}
