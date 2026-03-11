import { useState } from 'react';
import { Satellite, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../services/api';

interface SatelliteReading {
  id: string;
  source: string;
  capturedAt: string;
  chlorophyllA: number | null;
  surfaceTemperature: number | null;
  turbidityDerived: number | null;
  cloudCoverPercent: number | null;
  resolutionMeters: number | null;
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

const sourceLabels: Record<string, string> = {
  USGS_WQP: 'USGS WQP',
  NASA_MODIS: 'NASA MODIS',
  COPERNICUS_SENTINEL2: 'ESA Sentinel-2',
  COPERNICUS_SENTINEL3: 'ESA Sentinel-3',
  COPERNICUS_CMEMS: 'Copernicus CMEMS',
};

const sourceColor: Record<string, string> = {
  USGS_WQP: '#003F8A',
  NASA_MODIS: '#0066CC',
  COPERNICUS_SENTINEL2: '#00A8E0',
  COPERNICUS_SENTINEL3: '#1A7A4A',
  COPERNICUS_CMEMS: '#0066CC',
};

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16) + ' UTC';
}

export default function SatellitePage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [days, setDays] = useState(7);
  const [fetching, setFetching] = useState(false);

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch<Location[]>('/locations'),
  });
  const locations = (locationsData ?? []) as Location[];

  const {
    data: readingsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['satellite-readings', selectedLocationId, days],
    queryFn: () =>
      apiFetch<SatelliteReading[]>(
        `/satellite/readings?locationId=${selectedLocationId}&days=${days}`,
      ),
    enabled: !!selectedLocationId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const readings = (readingsData ?? []) as SatelliteReading[];

  const handleFetchData = async () => {
    if (!selectedLocationId) return;
    setFetching(true);
    try {
      await apiFetch('/satellite/refresh-all', { method: 'POST' });
      setTimeout(() => { void refetch(); }, 3000);
    } catch {
      // error handled by query
    } finally {
      setFetching(false);
    }
  };

  const handleExportCsv = () => {
    if (readings.length === 0) return;
    const headers = [
      'Timestamp (UTC)',
      'Source',
      'Surface Temp (°C)',
      'Chlorophyll-a (µg/L)',
      'Turbidity NTU',
      'Cloud Cover %',
      'Resolution (m)',
    ];
    const rows = readings.map((r) => [
      formatTimestamp(r.capturedAt),
      sourceLabels[r.source] ?? r.source,
      r.surfaceTemperature?.toFixed(2) ?? '',
      r.chlorophyllA?.toFixed(3) ?? '',
      r.turbidityDerived?.toFixed(1) ?? '',
      r.cloudCoverPercent?.toFixed(0) ?? '',
      r.resolutionMeters?.toFixed(0) ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satellite-data-${selectedLocationId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data — group by capturedAt
  const chartData = readings
    .slice()
    .reverse()
    .map((r) => ({
      time: r.capturedAt.substring(0, 10),
      sst: r.surfaceTemperature,
      chl: r.chlorophyllA,
      turbidity: r.turbidityDerived,
    }));

  const sourceSet = [...new Set(readings.map((r) => r.source))];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: '1440px' }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>
            Satellite Data Explorer
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
            USGS NWIS · Copernicus CMEMS · NASA MODIS/VIIRS
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label
              htmlFor="location-select"
              style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '6px' }}
            >
              Location
            </label>
            <select
              id="location-select"
              className="input-field"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select a location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="days-select"
              style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '6px' }}
            >
              Date Range
            </label>
            <select
              id="days-select"
              className="input-field"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ cursor: 'pointer' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void handleFetchData()}
              disabled={!selectedLocationId || fetching}
              className="btn-primary flex items-center gap-2"
              style={{ fontSize: '13px', flex: 1 }}
            >
              {fetching ? (
                <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Satellite size={14} aria-hidden="true" />
              )}
              {fetching ? 'Fetching...' : 'Fetch Data'}
            </button>
          </div>

          <div>
            <button
              onClick={handleExportCsv}
              disabled={readings.length === 0}
              className="btn-secondary flex items-center gap-2"
              style={{ fontSize: '13px', width: '100%' }}
            >
              <Download size={14} aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Status panels */}
      {sourceSet.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sourceSet.map((src) => {
            const srcReadings = readings.filter((r) => r.source === src);
            const latest = srcReadings[0];
            const color = sourceColor[src] ?? '#6B7280';
            return (
              <div key={src} className="card" style={{ padding: '14px 16px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                    {sourceLabels[src] ?? src}
                  </span>
                </div>
                <p style={{ fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color, marginBottom: '2px' }}>
                  {srcReadings.length}
                </p>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>data points</p>
                {latest && (
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    Latest: {latest.capturedAt.substring(0, 10)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-2 p-3"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '13px', color: '#B91C1C' }}
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>Failed to load satellite data. Please try again.</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && selectedLocationId && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
          Loading satellite data...
        </div>
      )}

      {/* Time series chart */}
      {readings.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
            Parameter Time Series
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  fontSize: '12px',
                  boxShadow: 'none',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: '#374151' }}
              />
              <Line
                type="monotone"
                dataKey="sst"
                name="Surface Temp (°C)"
                stroke="#003F8A"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="chl"
                name="Chlorophyll-a (µg/L)"
                stroke="#1A7A4A"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="turbidity"
                name="Turbidity (NTU)"
                stroke="#B45309"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data table */}
      {readings.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              Raw Data — {readings.length} records
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              All timestamps in UTC · Data sourced from open APIs
            </p>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
                  {['Timestamp (UTC)', 'Source', 'Surf. Temp (°C)', 'Chlorophyll-a (µg/L)', 'Turbidity (NTU)', 'Cloud Cover %', 'Resolution (m)'].map(
                    (h, i) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {readings.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                      borderBottom: '1px solid #F3F4F6',
                      height: '40px',
                    }}
                  >
                    <td style={{ padding: '0 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(r.capturedAt)}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: sourceColor[r.source] ?? '#6B7280',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                        <span style={{ color: '#374151' }}>{sourceLabels[r.source] ?? r.source}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1E3A5F' }}>
                      {r.surfaceTemperature != null ? r.surfaceTemperature.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.chlorophyllA != null ? r.chlorophyllA.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#374151' }}>
                      {r.turbidityDerived != null ? r.turbidityDerived.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', color: '#374151' }}>
                      {r.cloudCoverPercent != null ? `${r.cloudCoverPercent.toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ padding: '0 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#6B7280' }}>
                      {r.resolutionMeters != null ? r.resolutionMeters.toFixed(0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedLocationId && (
        <div
          style={{ padding: '64px 32px', textAlign: 'center', color: '#9CA3AF' }}
        >
          <Satellite size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} aria-hidden="true" />
          <p style={{ fontSize: '14px' }}>Select a location to explore satellite data</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Data sources: USGS NWIS, Copernicus CMEMS, NASA MODIS/VIIRS
          </p>
        </div>
      )}
    </div>
  );
}
