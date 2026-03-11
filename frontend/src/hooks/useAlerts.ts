import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export function useAlerts(status?: string) {
  return useQuery({
    queryKey: ['alerts', status],
    queryFn: () => apiFetch(`/alerts${status ? `?status=${status}` : ''}`),
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      apiFetch(`/alerts/${alertId}/acknowledge`, { method: 'PATCH', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, resolutionNote }: { alertId: string; resolutionNote: string }) =>
      apiFetch(`/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNote }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
