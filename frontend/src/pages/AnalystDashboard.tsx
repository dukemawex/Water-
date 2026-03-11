import { useState } from 'react';
import { Activity, AlertTriangle, Radio, MapPin, RefreshCw, Satellite } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAlerts } from '../hooks/useAlerts';

interface Reading {
  id: string;
  qualityGrade: string;
  overallScore: number;
  recordedAt: string;
  location: { id: string; name: string };
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
}

// Colour-blind-safe, matches ESA palette
const gradeColors: Record<string, string> = {
  EXCELLENT: '#1A7A4A',
  GOOD: '#2D9D5C',
  FAIR: '#B45309',
  POOR: '#C2410C',
  CRITICAL: '#B91C1C',
};

const gradeLabel: Record<string, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  CRITICAL: 'Critical',
};

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16) + ' UTC';
}

export default function AnalystDashboard() {
  const [liveReadings, setLiveReadings] = useState<Reading[]>([]);
  const { data: alertsData, refetch: refetchAlerts } = useAlerts('ACTIVE');
  const { data: readingsData, refetch: refetchReadings } = useQuery({
    queryKey: ['latest-readings'],
    queryFn: () => apiFetch<Reading[]>('/readings/latest'),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch<Array<{ id: string }>>('/locations'),
  });

  useWebSocket((event) => {
    if (event.type === 'reading:new') {
      const payload = event.payload as Reading;
      setLiveReadings((prev) => [payload, ...prev.slice(0, 49)]);
    }
    if (event.type === 'alert:created') void refetchAlerts();
    if (event.type === 'sensor:offline') void refetchReadings();
  }, ['admin:all']);

  const readings = (readingsData ?? []) as Reading[];
  const activeAlerts = ((alertsData as { items: unknown[] } | null)?.items?.length ?? 0);
  const locations = (locationsData ?? []) as Array<{ id: string }>;

  const gradeDist = Object.entries(
    [...readings, ...liveReadings].reduce(
      (acc, r) => {
        acc[r.qualityGrade] = (acc[r.qualityGrade] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).map(([name, value]) => ({ name, value }));

  const allReadings = [...liveReadings, ...readings].slice(0, 30);
  const atRisk = readings.filter(
    (r) => r.qualityGrade === 'CRITICAL' || r.qualityGrade === 'POOR',
  ).length;

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: '1440px' }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>
          Monitoring Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC
          </span>
          <button
            onClick={() => { void refetchReadings(); void refetchAlerts(); }}
            className="btn-secondary flex items-center gap-2"
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: AlertTriangle,
            value: activeAlerts,
            label: 'Active Alerts',
            color: activeAlerts > 0 ? '#B91C1C' : '#6B7280',
          },
          {
            icon: MapPin,
            value: locations.length,
            label: 'Monitored Locations',
            color: '#003F8A',
          },
          {
            icon: Radio,
            value: liveReadings.length,
            label: 'Live Updates (session)',
            color: '#1A7A4A',
          },
          {
            icon: Activity,
            value: atRisk,
            label: 'Locations At Risk',
            color: atRisk > 0 ? '#B45309' : '#6B7280',
          },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px' }}>
            <div className="flex items-center gap-3">
              <Icon size={18} style={{ color, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <p
                  className="data-value"
                  style={{ fontSize: '24px', color }}
                >
                  {value}
                </p>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280' }}>
                  {label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live reading feed */}
        <div className="lg:col-span-2 card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <Activity size={16} style={{ color: '#003F8A' }} aria-hidden="true" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Live Reading Feed
              </span>
              {liveReadings.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#1A7A4A',
                    background: '#DCFCE7',
                    padding: '1px 6px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #86EFAC',
                  }}
                >
                  Live
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {allReadings.length} readings
            </span>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    Location
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                    Grade
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                    Score
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                    pH
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                    DO mg/L
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    Timestamp (UTC)
                  </th>
                </tr>
              </thead>
              <tbody aria-live="polite" aria-label="Live readings">
                {allReadings.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                      borderBottom: '1px solid #F3F4F6',
                      height: '40px',
                    }}
                  >
                    <td style={{ padding: '0 12px', color: '#111827', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.location?.name ?? 'Unknown'}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: gradeColors[r.qualityGrade] ?? '#6B7280',
                            flexShrink: 0,
                            display: 'inline-block',
                          }}
                          aria-hidden="true"
                        />
                        <span style={{ fontWeight: 600, color: gradeColors[r.qualityGrade] ?? '#6B7280', fontSize: '12px' }}>
                          {gradeLabel[r.qualityGrade] ?? r.qualityGrade}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1E3A5F', fontSize: '13px' }}>
                      {r.overallScore.toFixed(0)}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151', fontSize: '13px' }}>
                      {r.ph != null ? r.ph.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151', fontSize: '13px' }}>
                      {r.dissolvedOxygen != null ? r.dissolvedOxygen.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '0 12px', color: '#6B7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(r.recordedAt)}
                    </td>
                  </tr>
                ))}
                {allReadings.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>
                      No readings available. Waiting for incoming data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade distribution chart */}
        <div className="card">
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
            Quality Distribution
          </p>
          {gradeDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={gradeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    strokeWidth={1}
                    stroke="#FFFFFF"
                  >
                    {gradeDist.map((entry) => (
                      <Cell key={entry.name} fill={gradeColors[entry.name] ?? '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxShadow: 'none',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {gradeDist.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: gradeColors[d.name] ?? '#9CA3AF',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <span style={{ fontSize: '12px', color: '#374151' }}>
                        {gradeLabel[d.name] ?? d.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: '#1E3A5F',
                      }}
                    >
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0', fontSize: '13px' }}>
              No data yet
            </p>
          )}
        </div>
      </div>

      {/* Data sources summary */}
      <div className="card">
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
          Active Data Sources
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'USGS NWIS', desc: 'Real-time river gauges (USA)', icon: Activity, color: '#003F8A' },
            { name: 'Copernicus CMEMS', desc: 'Sea surface temperature, chlorophyll', icon: Satellite, color: '#0066CC' },
            { name: 'NASA Earthdata', desc: 'MODIS/VIIRS ocean colour', icon: Satellite, color: '#00A8E0' },
            { name: 'Manual / IoT', desc: 'Field sensors and manual readings', icon: Radio, color: '#6B7280' },
          ].map(({ name, desc, icon: Icon, color }) => (
            <div
              key={name}
              style={{
                padding: '12px 14px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} style={{ color }} aria-hidden="true" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{name}</span>
              </div>
              <p style={{ fontSize: '11px', color: '#6B7280' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
