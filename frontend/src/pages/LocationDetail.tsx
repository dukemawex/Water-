import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../services/api';
import QualityBadge from '../components/ui/QualityBadge';
import ParameterCard from '../components/ui/ParameterCard';
import SatelliteDataPanel from '../components/ui/SatelliteDataPanel';
import { MapPin, Activity, AlertTriangle, FileText, Satellite } from 'lucide-react';

type Tab = 'overview' | 'live' | 'sensors' | 'reports' | 'satellite';

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: location } = useQuery({
    queryKey: ['location', id],
    queryFn: () => apiFetch(`/locations/${id}`),
    enabled: !!id,
  });

  const { data: trend } = useQuery({
    queryKey: ['trend', id],
    queryFn: () => apiFetch(`/readings/trend?locationId=${id}&days=30`),
    enabled: !!id,
  });

  const loc = location as {
    id: string;
    name: string;
    waterBodyType: string;
    latitude: number;
    longitude: number;
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
    aiAnalyses: Array<{ publicMessage: string; riskLevel: string; recommendations: Array<{ priority: string; action: string; timeline: string }> }>;
    alerts: Array<{ id: string; title: string; severity: string; parameter: string }>;
    satelliteReadings: Array<{ id: string; source: string; capturedAt: string; chlorophyllA?: number; turbidityDerived?: number }>;
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
    { key: 'live', label: 'Live Data', icon: <Activity size={15} aria-hidden="true" /> },
    { key: 'satellite', label: 'Satellite', icon: <Satellite size={15} aria-hidden="true" /> },
    { key: 'sensors', label: 'Sensors', icon: <MapPin size={15} aria-hidden="true" /> },
    { key: 'reports', label: 'AI Reports', icon: <FileText size={15} aria-hidden="true" /> },
  ];

  if (!loc) return <div className="p-6 text-gray-400">Loading location...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{loc.name}</h1>
          <p className="text-gray-400 text-sm">{loc.waterBodyType} • {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E</p>
        </div>
        {latestReading && <QualityBadge grade={latestReading.qualityGrade} size="lg" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-0" role="tablist">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-water-500 text-water-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Parameter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <ParameterCard label="pH" value={latestReading?.ph} unit="" min={0} max={14} optimal={{ min: 6.5, max: 8.5 }} />
            <ParameterCard label="Turbidity" value={latestReading?.turbidity} unit=" NTU" min={0} max={50} optimal={{ min: 0, max: 1 }} />
            <ParameterCard label="Dissolved O₂" value={latestReading?.dissolvedOxygen} unit=" mg/L" min={0} max={15} optimal={{ min: 6, max: 15 }} />
            <ParameterCard label="Temperature" value={latestReading?.temperature} unit="°C" min={0} max={40} optimal={{ min: 10, max: 20 }} />
            <ParameterCard label="Conductivity" value={latestReading?.conductivity} unit=" µS/cm" min={0} max={2000} />
            <ParameterCard label="Nitrate" value={latestReading?.nitrate} unit=" mg/L" min={0} max={100} optimal={{ min: 0, max: 50 }} />
            <ParameterCard label="Bacteria" value={latestReading?.bacteria} unit=" CFU" min={0} max={1000} optimal={{ min: 0, max: 100 }} />
          </div>

          {/* pH & Turbidity trend chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4">30-Day Trend: pH & Turbidity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => new Date(v as string).toLocaleDateString()} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#d1d5db' }}
                  labelFormatter={(v) => new Date(v as string).toLocaleString()}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Line type="monotone" dataKey="ph" stroke="#0EA5E9" strokeWidth={2} dot={false} name="pH" />
                <Line type="monotone" dataKey="turbidity" stroke="#f59e0b" strokeWidth={2} dot={false} name="Turbidity (NTU)" />
                <Line type="monotone" dataKey="satelliteTurbidity" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="🛰 Satellite Turbidity" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insight */}
          {latestAI && (
            <div className="card border-l-4 border-water-500">
              <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-water-500" aria-hidden="true" />
                AI Scientist Analysis
              </h3>
              <p className="text-gray-300 text-sm mb-3">{latestAI.publicMessage}</p>
              <div className="space-y-2">
                {(latestAI.recommendations as Array<{ priority: string; action: string; timeline: string }>).slice(0, 3).map((rec, i) => (
                  <div key={i} className={`flex gap-2 text-sm p-2 rounded-lg ${rec.priority === 'HIGH' ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-800'}`}>
                    <span className={`font-medium flex-shrink-0 ${rec.priority === 'HIGH' ? 'text-red-400' : rec.priority === 'MEDIUM' ? 'text-amber-400' : 'text-green-400'}`}>
                      [{rec.priority}]
                    </span>
                    <span className="text-gray-300">{rec.action}</span>
                    <span className="text-gray-500 ml-auto flex-shrink-0">{rec.timeline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Data tab */}
      {activeTab === 'live' && (
        <div className="card overflow-auto">
          <table className="w-full text-sm" aria-label="Live sensor readings">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Grade</th>
                <th className="text-right py-2 px-3">pH</th>
                <th className="text-right py-2 px-3">Turbidity</th>
                <th className="text-right py-2 px-3">DO (mg/L)</th>
                <th className="text-right py-2 px-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {loc.readings.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="py-2 px-3 text-gray-400">{new Date(r.recordedAt).toLocaleString()}</td>
                  <td className="py-2 px-3"><QualityBadge grade={r.qualityGrade} size="sm" /></td>
                  <td className="py-2 px-3 text-right font-mono text-gray-300">{r.ph?.toFixed(2) ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-300">{r.turbidity?.toFixed(1) ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-300">{r.dissolvedOxygen?.toFixed(1) ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-gray-100">{r.overallScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Satellite tab */}
      {activeTab === 'satellite' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SatelliteDataPanel locationId={loc.id} />

          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
              <Satellite size={16} aria-hidden="true" /> Satellite History
            </h3>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-xs" aria-label="Satellite reading history">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 px-2">Source</th>
                    <th className="text-left py-1.5 px-2">Captured</th>
                    <th className="text-right py-1.5 px-2">Chl-a (µg/L)</th>
                    <th className="text-right py-1.5 px-2">Turbidity (NTU)</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.satelliteReadings.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50">
                      <td className="py-1.5 px-2 text-blue-400">{s.source}</td>
                      <td className="py-1.5 px-2 text-gray-400">{new Date(s.capturedAt).toLocaleDateString()}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-300">{s.chlorophyllA?.toFixed(2) ?? '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-300">{s.turbidityDerived?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                  {loc.satelliteReadings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-600">No satellite data yet. Click "Refresh" to fetch.</td>
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
          {loc.sensors.map((s) => (
            <div key={s.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-200 text-sm">{s.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' :
                  s.status === 'FAULT' ? 'bg-red-500/10 text-red-400' :
                  'bg-amber-500/10 text-amber-400'
                }`} role="status">
                  {s.status}
                </span>
              </div>
              {s.batteryLevel != null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Battery</span>
                    <span>{s.batteryLevel}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.batteryLevel > 50 ? 'bg-emerald-500' : s.batteryLevel > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${s.batteryLevel}%` }}
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
          ))}
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-200">Generate AI Report</h3>
          <p className="text-gray-400 text-sm">
            Generate a comprehensive 30-day PDF report with AI-generated executive summary, trend analysis, and recommendations.
          </p>
          <button
            onClick={async () => {
              const res = await apiFetch<{ filename: string; path: string }>(`/reports/generate/${loc.id}`, { method: 'POST' });
              window.open(res.path, '_blank');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FileText size={16} aria-hidden="true" />
            Generate PDF Report
          </button>
          {latestAI && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Latest AI Summary</p>
              <p className="text-sm text-gray-300">{latestAI.publicMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
