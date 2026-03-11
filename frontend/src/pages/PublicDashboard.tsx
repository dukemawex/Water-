import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Activity, MapPin, AlertTriangle, Satellite } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useMapPins } from '../hooks/useLocations';
import { useWebSocket } from '../hooks/useWebSocket';
import AlertTicker from '../components/ui/AlertTicker';
import QualityBadge from '../components/ui/QualityBadge';
import type { PublicMapPin } from '@water-sentinel/shared';

const gradeColor: Record<string, string> = {
  EXCELLENT: '#10b981',
  GOOD: '#22c55e',
  FAIR: '#f59e0b',
  POOR: '#f97316',
  CRITICAL: '#dc2626',
  UNKNOWN: '#6b7280',
};

export default function PublicDashboard() {
  const { data: pins = [], refetch } = useMapPins();
  const [liveAlerts, setLiveAlerts] = useState<Array<{ id: string; title: string; severity: string }>>([]);

  useWebSocket((event) => {
    if (event.type === 'reading:new') refetch();
    if (event.type === 'alert:created') {
      const payload = event.payload as { title: string; severity: string; locationId: string };
      if (payload.severity === 'CRITICAL' || payload.severity === 'HIGH') {
        setLiveAlerts((prev) => [
          { id: `${Date.now()}`, title: payload.title, severity: payload.severity },
          ...prev.slice(0, 4),
        ]);
      }
    }
  });

  const typedPins = pins as PublicMapPin[];
  const safePct = typedPins.length > 0
    ? Math.round((typedPins.filter((p) => ['EXCELLENT', 'GOOD'].includes(p.qualityGrade)).length / typedPins.length) * 100)
    : 0;

  const withSatellite = typedPins.filter((p) => p.satelliteData).length;

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      {/* Alert ticker */}
      <AlertTicker alerts={liveAlerts} />

      {/* Header */}
      <header className="bg-ocean-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets size={28} className="text-water-500" aria-hidden="true" />
          <div>
            <h1 className="font-bold text-gray-100">Water Quality Sentinel</h1>
            <p className="text-xs text-gray-400">Real-time monitoring platform</p>
          </div>
        </div>
        <Link to="/login" className="btn-secondary text-sm">
          Staff Login
        </Link>
      </header>

      {/* Stats bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-water-500" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-gray-100">{typedPins.length}</p>
              <p className="text-xs text-gray-500">Monitoring Sites</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-emerald-500" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-emerald-400">{safePct}%</p>
              <p className="text-xs text-gray-500">Safe Locations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-amber-400">{liveAlerts.length}</p>
              <p className="text-xs text-gray-500">Active Alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Satellite size={20} className="text-blue-400" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-blue-400">{withSatellite}</p>
              <p className="text-xs text-gray-500">Satellite-Enhanced</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer
            center={[54.0, -2.0]}
            zoom={6}
            className="w-full h-full"
            style={{ background: '#0F2A4A' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {typedPins.map((pin) => (
              <CircleMarker
                key={pin.locationId}
                center={[pin.latitude, pin.longitude]}
                radius={pin.satelliteData ? 14 : 10}
                pathOptions={{
                  color: gradeColor[pin.qualityGrade] ?? gradeColor.UNKNOWN,
                  fillColor: gradeColor[pin.qualityGrade] ?? gradeColor.UNKNOWN,
                  fillOpacity: 0.7,
                  weight: pin.satelliteData ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="font-sans text-gray-800">
                    <p className="font-bold text-sm mb-1">{pin.name}</p>
                    <p className="text-xs">Grade: <strong>{pin.qualityGrade}</strong></p>
                    <p className="text-xs">Score: {pin.overallScore}/100</p>
                    {pin.satelliteData && (
                      <p className="text-xs text-blue-600 mt-1">
                        🛰 Satellite: {pin.satelliteData.source}
                      </p>
                    )}
                    {pin.lastReadingAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {new Date(pin.lastReadingAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-xs space-y-1 z-[1000]">
            <p className="font-medium text-gray-300 mb-2">Water Quality</p>
            {Object.entries(gradeColor).filter(([k]) => k !== 'UNKNOWN').map(([grade, color]) => (
              <div key={grade} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-gray-400">{grade.charAt(0) + grade.slice(1).toLowerCase()}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
              <span className="text-blue-400" aria-hidden="true">🛰</span>
              <span className="text-gray-400">Satellite data</span>
            </div>
          </div>
        </div>

        {/* Sidebar: recent alerts & locations */}
        <aside className="w-full lg:w-80 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 overflow-auto p-4 space-y-4">
          <h2 className="font-semibold text-gray-200 text-sm uppercase tracking-wider">Monitoring Locations</h2>
          {typedPins.map((pin) => (
            <div key={pin.locationId} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-200 text-sm">{pin.name}</p>
                <QualityBadge grade={pin.qualityGrade} size="sm" />
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Score: <span className="font-mono text-gray-300">{pin.overallScore}</span>/100</span>
                {pin.satelliteData && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Satellite size={10} aria-hidden="true" /> Satellite
                  </span>
                )}
              </div>
            </div>
          ))}

          {typedPins.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No monitoring locations configured</p>
          )}

          <div className="pt-4 border-t border-gray-800 text-xs text-gray-600">
            <p className="flex items-center gap-1">
              <Satellite size={12} aria-hidden="true" />
              Satellite data: USGS WQP, NASA MODIS, ESA Copernicus
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
