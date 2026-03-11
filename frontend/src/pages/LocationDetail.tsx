import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../services/api';
import SatelliteDataPanel from '../components/ui/SatelliteDataPanel';
import { MapPin, Activity, AlertTriangle, FileText, Satellite, Radio } from 'lucide-react';

type Tab = 'overview' | 'live' | 'sensors' | 'reports' | 'satellite';

const gradeColors: Record<string, string> = {
  EXCELLENT: '#1A7A4A',
  GOOD: '#2D9D5C',
  FAIR: '#B45309',
  POOR: '#C2410C',
  CRITICAL: '#B91C1C',
};

function GradeDot({ grade }: { grade: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: gradeColors[grade] ?? '#6B7280',
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ fontSize: '12px', fontWeight: 600, color: gradeColors[grade] ?? '#6B7280' }}>
        {grade}
      </span>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16) + ' UTC';
}

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: location, isLoading } = useQuery({
    queryKey: ['location', id],
    queryFn: () => apiFetch(`/locations/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: trend } = useQuery({
    queryKey: ['trend', id],
    queryFn: () => apiFetch(`/readings/trend?locationId=${id}&days=30`),
    enabled: !!id,
    staleTime: 60_000,
  });

  const loc = location as {
    id: string;
    name: string;
    waterBodyType: string;
    latitude: number;
    longitude: number;
    country: string;
    readings: Array<{
      id: string;
      qualityGrade: string;
      overallScore: number;
      ph?: number;
      turbidity?: number;
      dissolvedOxygen?: number;
      conductivity?: number;
      temperature?: number;
      nitrate?: number;
      bacteria?: number;
      recordedAt: string;
    }>;
    sensors: Array<{ id: string; name: string; status: string; batteryLevel?: number }>;
    aiAnalyses: Array<{
      publicMessage: string;
      riskLevel: string;
      recommendations: Array<{ priority: string; action: string; timeline: string }>;
    }>;
    alerts: Array<{ id: string; title: string; severity: string; parameter: string }>;
    satelliteReadings: Array<{
      id: string;
      source: string;
      capturedAt: string;
      chlorophyllA?: number;
      turbidityDerived?: number;
    }>;
  } | null;

  const trendData = (trend ?? []) as Array<{
    timestamp: string;
    ph?: number;
    turbidity?: number;
    dissolvedOxygen?: number;
    overallScore?: number;
    satelliteTurbidity?: number;
  }>;

  const latestReading = loc?.readings[0];
  const latestAI = loc?.aiAnalyses[0];

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'overview', label: 'Overview', icon: <Activity size={15} aria-hidden="true" /> },
    { key: 'live', label: 'Readings', icon: <Activity size={15} aria-hidden="true" /> },
    { key: 'satellite', label: 'Satellite', icon: <Satellite size={15} aria-hidden="true" /> },
    { key: 'sensors', label: 'Sensors', icon: <Radio size={15} aria-hidden="true" /> },
    { key: 'reports', label: 'Reports', icon: <FileText size={15} aria-hidden="true" /> },
  ];

  if (isLoading || !loc) {
    return (
      <div style={{ padding: '32px', color: '#9CA3AF', fontSize: '14px' }}>
        Loading location data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: '1440px' }}>
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
            {loc.name}
          </h1>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} aria-hidden="true" />
              {loc.waterBodyType} · {loc.country}
            </span>
            <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#6B7280' }}>
              {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
            </span>
          </div>
        </div>
        {latestReading && (
          <GradeDot grade={latestReading.qualityGrade} />
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid #D1D5DB' }}
        role="tablist"
      >
        {tabs.map(({ key, label, icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5"
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? '#003F8A' : '#6B7280',
                borderBottom: active ? '2px solid #003F8A' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Parameter grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'pH', value: latestReading?.ph, unit: '', decimals: 2, optRange: [6.5, 8.5] },
              { label: 'Turbidity', value: latestReading?.turbidity, unit: ' NTU', decimals: 1, optRange: [0, 4] },
              { label: 'Dissolved O\u2082', value: latestReading?.dissolvedOxygen, unit: ' mg/L', decimals: 1, optRange: [6, 15] },
              { label: 'Temperature', value: latestReading?.temperature, unit: '\u00B0C', decimals: 1, optRange: [10, 25] },
              { label: 'Conductivity', value: latestReading?.conductivity, unit: ' \u00B5S/cm', decimals: 0 },
              { label: 'Nitrate', value: latestReading?.nitrate, unit: ' mg/L', decimals: 1, optRange: [0, 50] },
              { label: 'Bacteria', value: latestReading?.bacteria, unit: ' CFU/100ml', decimals: 0, optRange: [0, 100] },
              {
                label: 'Quality Score',
                value: latestReading?.overallScore,
                unit: '/100',
                decimals: 0,
              },
            ].map(({ label, value, unit, decimals, optRange }) => {
              const inRange =
                optRange && value != null
                  ? value >= optRange[0] && value <= optRange[1]
                  : null;
              return (
                <div key={label} className="card" style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', marginBottom: '6px' }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '20px', color: '#1E3A5F' }}>
                    {value != null ? value.toFixed(decimals) : '—'}
                    <span style={{ fontSize: '12px', fontWeight: 400, color: '#9CA3AF', marginLeft: '2px' }}>
                      {value != null ? unit : ''}
                    </span>
                  </p>
                  {inRange !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: inRange ? '#1A7A4A' : '#B91C1C',
                          display: 'inline-block',
                        }}
                        aria-hidden="true"
                      />
                      <span style={{ fontSize: '11px', color: inRange ? '#1A7A4A' : '#B91C1C' }}>
                        {inRange ? 'Within range' : 'Out of range'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 30-day trend chart */}
          <div className="card">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              30-Day Trend
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData.slice(-30)} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(v) => (v as string).substring(5, 10)}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    boxShadow: 'none',
                  }}
                  labelFormatter={(v) => formatTimestamp(v as string)}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#374151' }} />
                <Line type="monotone" dataKey="ph" stroke="#003F8A" strokeWidth={1.5} dot={false} name="pH" connectNulls />
                <Line type="monotone" dataKey="turbidity" stroke="#B45309" strokeWidth={1.5} dot={false} name="Turbidity (NTU)" connectNulls />
                <Line type="monotone" dataKey="dissolvedOxygen" stroke="#1A7A4A" strokeWidth={1.5} dot={false} name="DO (mg/L)" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI analysis */}
          {latestAI && (
            <div
              className="card"
              style={{ borderLeft: '4px solid #003F8A' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} style={{ color: '#003F8A' }} aria-hidden="true" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Analysis Summary
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: '20px', marginBottom: '12px' }}>
                {latestAI.publicMessage}
              </p>
              <div className="space-y-2">
                {latestAI.recommendations.slice(0, 3).map((rec, i) => {
                  const bgColor = rec.priority === 'HIGH' ? '#FEF2F2' : rec.priority === 'MEDIUM' ? '#FFFBEB' : '#F0FDF4';
                  const borderColor = rec.priority === 'HIGH' ? '#FCA5A5' : rec.priority === 'MEDIUM' ? '#FCD34D' : '#86EFAC';
                  const textColor = rec.priority === 'HIGH' ? '#B91C1C' : rec.priority === 'MEDIUM' ? '#B45309' : '#1A7A4A';
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: textColor, flexShrink: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>
                        [{rec.priority}]
                      </span>
                      <span style={{ color: '#374151', flex: 1 }}>{rec.action}</span>
                      <span style={{ color: '#9CA3AF', flexShrink: 0, fontSize: '12px' }}>{rec.timeline}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Readings table tab */}
      {activeTab === 'live' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="px-5 py-3"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              Reading History — {loc.readings.length} records
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} aria-label="Sensor readings">
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Timestamp (UTC)', 'Grade', 'pH', 'Turbidity NTU', 'DO mg/L', 'Temp °C', 'Score'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: i > 1 ? 'right' : 'left',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#6B7280',
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loc.readings.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: '1px solid #F3F4F6', height: '40px' }}>
                    <td style={{ padding: '0 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(r.recordedAt)}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <GradeDot grade={r.qualityGrade} />
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.ph?.toFixed(2) ?? '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.turbidity?.toFixed(1) ?? '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.dissolvedOxygen?.toFixed(1) ?? '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.temperature?.toFixed(1) ?? '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1E3A5F' }}>
                      {r.overallScore.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Satellite tab */}
      {activeTab === 'satellite' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SatelliteDataPanel locationId={loc.id} />

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Satellite Reading History
              </p>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} aria-label="Satellite readings">
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Source', 'Captured (UTC)', 'Chlorophyll-a µg/L', 'Turbidity NTU'].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          textAlign: i > 1 ? 'right' : 'left',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#6B7280',
                          borderBottom: '1px solid #E5E7EB',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loc.satelliteReadings.map((s, idx) => (
                    <tr key={s.id} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: '1px solid #F3F4F6', height: '40px' }}>
                      <td style={{ padding: '0 12px', color: '#0066CC', fontSize: '12px' }}>{s.source}</td>
                      <td style={{ padding: '0 12px', color: '#374151' }}>{formatTimestamp(s.capturedAt)}</td>
                      <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#1E3A5F' }}>
                        {s.chlorophyllA?.toFixed(3) ?? '—'}
                      </td>
                      <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#1E3A5F' }}>
                        {s.turbidityDerived?.toFixed(1) ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {loc.satelliteReadings.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                        No satellite data available. Use the Satellite Data page to fetch data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sensors tab */}
      {activeTab === 'sensors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loc.sensors.map((s) => {
            const statusColor = s.status === 'ONLINE' ? '#1A7A4A' : s.status === 'FAULT' ? '#B91C1C' : '#B45309';
            return (
              <div key={s.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, display: 'inline-block' }} aria-hidden="true" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor }}>{s.status}</span>
                  </div>
                </div>
                {s.batteryLevel != null && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>Battery</span>
                      <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1E3A5F' }}>
                        {s.batteryLevel}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${s.batteryLevel}%`,
                          background: s.batteryLevel > 50 ? '#1A7A4A' : s.batteryLevel > 20 ? '#B45309' : '#B91C1C',
                        }}
                        role="progressbar"
                        aria-valuenow={s.batteryLevel}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Battery level"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {loc.sensors.length === 0 && (
            <div style={{ padding: '32px', color: '#9CA3AF', fontSize: '13px', textAlign: 'center' }}>
              No sensors configured for this location
            </div>
          )}
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Generate Compliance Report
          </p>
          <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '20px', marginBottom: '20px' }}>
            Generate a 30-day PDF compliance report for this location. The report includes
            parameter trend analysis, threshold comparisons against WHO/EU/EPA standards,
            and recommendations.
          </p>
          <button
            onClick={async () => {
              const res = await apiFetch<{ filename: string; path: string }>(
                `/reports/generate/${loc.id}`,
                { method: 'POST' },
              );
              window.open(res.path, '_blank');
            }}
            className="btn-primary flex items-center gap-2"
            style={{ fontSize: '13px' }}
          >
            <FileText size={14} aria-hidden="true" />
            Generate PDF Report
          </button>
          {latestAI && (
            <div
              className="mt-4 p-4"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px' }}
            >
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '6px' }}>
                Latest Analysis Summary
              </p>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: '20px' }}>{latestAI.publicMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

