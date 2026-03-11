import { useState } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../hooks/useAlerts';

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

const severityStyle: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', color: '#B91C1C', border: '#FCA5A5' },
  HIGH: { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' },
  MEDIUM: { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' },
  LOW: { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
};

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16) + ' UTC';
}

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
    <div className="flex h-full" style={{ background: '#F2F4F7' }}>
      {/* Left: Alert list */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{
          width: '360px',
          background: '#FFFFFF',
          borderRight: '1px solid #D1D5DB',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #D1D5DB' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} style={{ color: '#003F8A' }} aria-hidden="true" />
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Alert Centre</h1>
          </div>
          <div className="flex gap-1">
            {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filter === s ? '#003F8A' : '#D1D5DB',
                  background: filter === s ? '#003F8A' : '#FFFFFF',
                  color: filter === s ? '#FFFFFF' : '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Alert rows */}
        <div className="flex-1 overflow-auto" aria-label="Alert list">
          {isLoading && (
            <p style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
              Loading alerts...
            </p>
          )}
          {!isLoading && alerts.length === 0 && (
            <p style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
              No {filter.toLowerCase()} alerts
            </p>
          )}
          {alerts.map((alert) => {
            const style = severityStyle[alert.severity] ?? severityStyle.LOW;
            const isSelected = selected?.id === alert.id;
            return (
              <button
                key={alert.id}
                onClick={() => setSelected(alert)}
                aria-current={isSelected ? 'true' : undefined}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderBottom: '1px solid #F3F4F6',
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  borderLeft: isSelected ? '3px solid #003F8A' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {alert.title}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '2px',
                      flexShrink: 0,
                      background: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
                  {alert.location?.name}
                </p>
                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {formatTimestamp(alert.createdAt)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <div style={{ maxWidth: '700px' }}>
            {/* Alert header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  {selected.title}
                </h2>
                <p style={{ fontSize: '13px', color: '#6B7280' }}>{selected.location?.name}</p>
              </div>
              {(() => {
                const style = severityStyle[selected.severity] ?? severityStyle.LOW;
                return (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    {selected.severity}
                  </span>
                );
              })()}
            </div>

            {/* Details card */}
            <div className="card mb-4">
              <p
                className="section-label mb-3"
                style={{ color: '#6B7280' }}
              >
                Alert Details
              </p>
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px', lineHeight: '20px' }}>
                {selected.description}
              </p>
              <div
                className="grid grid-cols-2 gap-0"
                style={{ border: '1px solid #E5E7EB', borderRadius: '4px', overflow: 'hidden' }}
              >
                {[
                  { label: 'Parameter', value: selected.parameter },
                  { label: 'Status', value: selected.status },
                  { label: 'Measured Value', value: selected.value.toString(), mono: true, highlight: true },
                  { label: 'Threshold', value: selected.threshold.toString(), mono: true },
                ].map(({ label, value, mono, highlight }, idx) => (
                  <div
                    key={label}
                    style={{
                      padding: '10px 14px',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                      borderBottom: idx < 2 ? '1px solid #E5E7EB' : 'none',
                      borderRight: idx % 2 === 0 ? '1px solid #E5E7EB' : 'none',
                    }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', marginBottom: '2px' }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: mono ? '15px' : '14px',
                        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
                        fontWeight: mono ? 700 : 400,
                        color: highlight ? '#B91C1C' : '#111827',
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="card mb-4">
              <p className="section-label mb-3" style={{ color: '#6B7280' }}>
                Timeline
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#374151' }}>
                  <AlertTriangle size={14} style={{ color: '#B91C1C', flexShrink: 0 }} aria-hidden="true" />
                  <span>Created: {formatTimestamp(selected.createdAt)}</span>
                </div>
                {selected.acknowledgedAt && (
                  <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#374151' }}>
                    <Clock size={14} style={{ color: '#B45309', flexShrink: 0 }} aria-hidden="true" />
                    <span>Acknowledged: {formatTimestamp(selected.acknowledgedAt)}</span>
                  </div>
                )}
                {selected.resolvedAt && (
                  <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#374151' }}>
                    <CheckCircle size={14} style={{ color: '#1A7A4A', flexShrink: 0 }} aria-hidden="true" />
                    <span>Resolved: {formatTimestamp(selected.resolvedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {selected.status === 'ACTIVE' && (
                <button
                  onClick={() => void handleAcknowledge(selected.id)}
                  className="btn-secondary flex items-center gap-2"
                  disabled={acknowledge.isPending}
                  style={{ fontSize: '13px' }}
                >
                  <Clock size={14} aria-hidden="true" />
                  Acknowledge
                </button>
              )}
            </div>

            {(selected.status === 'ACTIVE' || selected.status === 'ACKNOWLEDGED') && (
              <div className="card mt-4">
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '10px' }}>
                  Resolve Alert
                </p>
                <textarea
                  className="input-field"
                  style={{ resize: 'none', height: '80px', marginBottom: '10px' }}
                  placeholder="Enter resolution note (required, min 10 characters)..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  aria-label="Resolution note"
                />
                <button
                  onClick={() => void handleResolve(selected.id)}
                  className="btn-primary flex items-center gap-2"
                  disabled={resolutionNote.length < 10 || resolve.isPending}
                  style={{ fontSize: '13px' }}
                >
                  <CheckCircle size={14} aria-hidden="true" />
                  Mark as Resolved
                </button>
              </div>
            )}

            {selected.resolutionNote && (
              <div
                className="mt-4 p-4"
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderLeft: '4px solid #1A7A4A',
                  borderRadius: '4px',
                }}
              >
                <p className="section-label mb-1" style={{ color: '#1A7A4A' }}>
                  Resolution Note
                </p>
                <p style={{ fontSize: '13px', color: '#374151' }}>{selected.resolutionNote}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} aria-hidden="true" />
              <p style={{ fontSize: '14px' }}>Select an alert to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
