import { useState } from 'react';
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../hooks/useAlerts';
import QualityBadge from '../components/ui/QualityBadge';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  parameter: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  location: { id: string; name: string };
}

const severityColor: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function AlertCenter() {
  const [selected, setSelected] = useState<Alert | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [filter, setFilter] = useState<string>('ACTIVE');

  const { data: alertsData, isLoading } = useAlerts(filter);
  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();

  const alerts = ((alertsData as { items: Alert[] } | null)?.items ?? []) as Alert[];

  const handleAcknowledge = async (alertId: string) => {
    await acknowledge.mutateAsync(alertId);
    if (selected?.id === alertId) setSelected((prev) => prev ? { ...prev, status: 'ACKNOWLEDGED' } : null);
  };

  const handleResolve = async (alertId: string) => {
    if (!resolutionNote.trim()) return;
    await resolve.mutateAsync({ alertId, resolutionNote });
    setSelected(null);
    setResolutionNote('');
  };

  return (
    <div className="flex h-full">
      {/* Alert List */}
      <div className="w-full md:w-1/2 lg:w-2/5 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Bell size={18} className="text-water-500" aria-hidden="true" />
            Alert Center
          </h1>
          <div className="flex gap-2 mt-3">
            {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filter === s
                    ? 'bg-water-500/20 text-water-400 border-water-500/30'
                    : 'text-gray-500 border-gray-700 hover:border-gray-600'
                }`}
                aria-pressed={filter === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2" aria-label="Alert list">
          {isLoading && <p className="text-gray-500 text-center py-8">Loading alerts...</p>}
          {!isLoading && alerts.length === 0 && (
            <p className="text-gray-600 text-center py-8">No {filter.toLowerCase()} alerts</p>
          )}
          {alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => setSelected(alert)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected?.id === alert.id
                  ? 'border-water-500/50 bg-water-500/10'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
              aria-current={selected?.id === alert.id ? 'true' : undefined}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-200">{alert.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${severityColor[alert.severity] ?? ''}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-xs text-gray-500">{alert.location?.name}</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 p-6 overflow-auto">
        {selected ? (
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-100">{selected.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{selected.location?.name}</p>
              </div>
              <span className={`text-sm px-3 py-1 rounded-full border ${severityColor[selected.severity] ?? ''}`}>
                {selected.severity}
              </span>
            </div>

            <div className="card space-y-3">
              <h3 className="font-medium text-gray-300 text-sm uppercase tracking-wider">Details</h3>
              <p className="text-gray-300">{selected.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Parameter</p>
                  <p className="font-mono text-gray-200">{selected.parameter}</p>
                </div>
                <div>
                  <p className="text-gray-500">Measured Value</p>
                  <p className="font-mono text-amber-400 font-bold">{selected.value}</p>
                </div>
                <div>
                  <p className="text-gray-500">Threshold</p>
                  <p className="font-mono text-gray-200">{selected.threshold}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium text-gray-200">{selected.status}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="card space-y-3">
              <h3 className="font-medium text-gray-300 text-sm uppercase tracking-wider">Timeline</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <AlertTriangle size={14} className="text-red-400" aria-hidden="true" />
                  <span>Created: {new Date(selected.createdAt).toLocaleString()}</span>
                </div>
                {selected.acknowledgedAt && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={14} className="text-amber-400" aria-hidden="true" />
                    <span>Acknowledged: {new Date(selected.acknowledgedAt).toLocaleString()}</span>
                  </div>
                )}
                {selected.resolvedAt && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <CheckCircle size={14} className="text-emerald-400" aria-hidden="true" />
                    <span>Resolved: {new Date(selected.resolvedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selected.status === 'ACTIVE' && (
              <div className="flex gap-3">
                <button
                  onClick={() => void handleAcknowledge(selected.id)}
                  className="btn-secondary flex items-center gap-2"
                  disabled={acknowledge.isPending}
                >
                  <Clock size={15} aria-hidden="true" />
                  Acknowledge
                </button>
              </div>
            )}

            {(selected.status === 'ACTIVE' || selected.status === 'ACKNOWLEDGED') && (
              <div className="card space-y-3">
                <h3 className="font-medium text-gray-300 text-sm">Resolve Alert</h3>
                <textarea
                  className="input-field resize-none h-24"
                  placeholder="Enter resolution note (required, min 10 chars)..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  aria-label="Resolution note"
                />
                <button
                  onClick={() => void handleResolve(selected.id)}
                  className="btn-primary flex items-center gap-2"
                  disabled={resolutionNote.length < 10 || resolve.isPending}
                >
                  <XCircle size={15} aria-hidden="true" />
                  Resolve Alert
                </button>
              </div>
            )}

            {selected.resolutionNote && (
              <div className="card border-l-4 border-emerald-500">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Resolution Note</p>
                <p className="text-gray-300 text-sm">{selected.resolutionNote}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Bell size={40} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p>Select an alert to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
