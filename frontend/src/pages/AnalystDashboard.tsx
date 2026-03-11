import { useState } from 'react';
import { Activity, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import QualityBadge from '../components/ui/QualityBadge';
import SatelliteDataPanel from '../components/ui/SatelliteDataPanel';
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

const gradeColors: Record<string, string> = {
  EXCELLENT: '#10b981',
  GOOD: '#22c55e',
  FAIR: '#f59e0b',
  POOR: '#f97316',
  CRITICAL: '#dc2626',
};

export default function AnalystDashboard() {
  const [liveReadings, setLiveReadings] = useState<Reading[]>([]);
  const { data: alertsData, refetch: refetchAlerts } = useAlerts('ACTIVE');
  const { data: readingsData, refetch: refetchReadings } = useQuery({
    queryKey: ['latest-readings'],
    queryFn: () => apiFetch<Reading[]>('/readings/latest'),
    refetchInterval: 60_000,
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
    if (event.type === 'alert:created') refetchAlerts();
    if (event.type === 'sensor:offline') refetchReadings();
  }, ['admin:all']);

  const readings = (readingsData ?? []) as Reading[];
  const activeAlerts = ((alertsData as { items: unknown[] } | null)?.items?.length ?? 0);
  const locations = (locationsData ?? []) as Array<{ id: string }>;

  // Grade distribution for donut chart
  const gradeDist = Object.entries(
    [...readings, ...liveReadings].reduce((acc, r) => {
      acc[r.qualityGrade] = (acc[r.qualityGrade] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).map(([name, value]) => ({ name, value }));

  const allReadings = [...liveReadings, ...readings].slice(0, 30);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Analyst Dashboard</h1>
        <button onClick={() => { refetchReadings(); refetchAlerts(); }} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-gray-100">{activeAlerts}</p>
              <p className="text-xs text-gray-500">Active Alerts</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-water-500" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-gray-100">{locations.length}</p>
              <p className="text-xs text-gray-500">Locations</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Wifi size={20} className="text-emerald-400" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-gray-100">{liveReadings.length}</p>
              <p className="text-xs text-gray-500">Live Updates</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <WifiOff size={20} className="text-amber-400" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {readings.filter((r) => r.qualityGrade === 'CRITICAL' || r.qualityGrade === 'POOR').length}
              </p>
              <p className="text-xs text-gray-500">At Risk</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Reading Feed */}
        <div className="lg:col-span-2 card space-y-3">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2">
            <Activity size={16} className="text-water-500" aria-hidden="true" />
            Live Reading Feed
            {liveReadings.length > 0 && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </h2>
          <div className="space-y-2 max-h-96 overflow-auto" aria-live="polite" aria-label="Live readings feed">
            {allReadings.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <QualityBadge grade={r.qualityGrade} size="sm" />
                  <span className="text-gray-300 font-medium">{r.location?.name ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="font-mono text-gray-300">{r.overallScore}/100</span>
                  {r.ph != null && <span>pH: <span className="font-mono text-gray-300">{r.ph.toFixed(1)}</span></span>}
                  <span>{new Date(r.recordedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {allReadings.length === 0 && (
              <p className="text-gray-600 text-center py-8">No readings yet. Waiting for data...</p>
            )}
          </div>
        </div>

        {/* Donut chart */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-200">Quality Distribution</h2>
          {gradeDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={gradeDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {gradeDist.map((entry) => (
                      <Cell key={entry.name} fill={gradeColors[entry.name] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#d1d5db' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {gradeDist.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: gradeColors[d.name] ?? '#6b7280' }} aria-hidden="true" />
                    <span className="text-gray-400">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-sm text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Satellite panels for each location */}
      {locations.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <span aria-hidden="true">🛰</span> Satellite Data Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.slice(0, 3).map((loc) => (
              <SatelliteDataPanel key={loc.id} locationId={loc.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
