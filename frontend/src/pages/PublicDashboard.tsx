import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Activity, MapPin, AlertTriangle, Satellite, Globe } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useMapPins } from '../hooks/useLocations';
import { useWebSocket } from '../hooks/useWebSocket';
import type { PublicMapPin } from '@water-sentinel/shared';

// Colour-blind-safe grade colours matching the ESA palette
const gradeColor: Record<string, string> = {
  EXCELLENT: '#1A7A4A',
  GOOD: '#2D9D5C',
  FAIR: '#B45309',
  POOR: '#C2410C',
  CRITICAL: '#B91C1C',
  UNKNOWN: '#6B7280',
};

const gradeLabel: Record<string, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  CRITICAL: 'Critical',
  UNKNOWN: 'No data',
};

export default function PublicDashboard() {
  const { data: pins = [], refetch } = useMapPins();
  const [criticalAlerts, setCriticalAlerts] = useState<Array<{ id: string; title: string }>>([]);

  useWebSocket((event) => {
    if (event.type === 'reading:new') refetch();
    if (event.type === 'alert:created') {
      const payload = event.payload as { title: string; severity: string };
      if (payload.severity === 'CRITICAL') {
        setCriticalAlerts((prev) => [
          { id: `${Date.now()}`, title: payload.title },
          ...prev.slice(0, 2),
        ]);
      }
    }
  });

  const typedPins = pins as PublicMapPin[];
  const safePct =
    typedPins.length > 0
      ? Math.round(
          (typedPins.filter((p) => ['EXCELLENT', 'GOOD'].includes(p.qualityGrade)).length /
            typedPins.length) *
            100,
        )
      : 0;
  const criticalCount = typedPins.filter((p) => p.qualityGrade === 'CRITICAL').length;
  const withSatellite = typedPins.filter((p) => p.satelliteData).length;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F2F4F7' }}>
      {/* Critical alert banner */}
      {criticalAlerts.length > 0 && (
        <div
          className="px-4 py-2 flex items-center gap-3"
          style={{
            background: '#B91C1C',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
          }}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>CRITICAL ALERT: {criticalAlerts[0].title}</span>
          <button
            onClick={() => setCriticalAlerts((p) => p.slice(1))}
            style={{ marginLeft: 'auto', opacity: 0.8, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', fontSize: '18px', lineHeight: 1 }}
            aria-label="Dismiss alert"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6"
        style={{
          height: '56px',
          background: '#FFFFFF',
          borderBottom: '1px solid #D1D5DB',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <Droplets size={20} style={{ color: '#003F8A' }} aria-hidden="true" />
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>Water Quality Sentinel</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '8px' }}>
              Global Monitoring Platform
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/register"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#003F8A',
              padding: '6px 14px',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Sign Up Free
          </Link>
          <Link
            to="/login"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#003F8A',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              padding: '6px 14px',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #D1D5DB',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ maxWidth: '1440px', margin: '0 auto', gap: '0' }}
        >
          {[
            {
              icon: Activity,
              value: typedPins.length,
              label: 'Monitoring Stations',
              color: '#003F8A',
            },
            {
              icon: MapPin,
              value: `${safePct}%`,
              label: 'Stations Within Limits',
              color: '#1A7A4A',
            },
            {
              icon: AlertTriangle,
              value: criticalCount,
              label: 'Critical Alerts',
              color: criticalCount > 0 ? '#B91C1C' : '#6B7280',
            },
            {
              icon: Satellite,
              value: withSatellite,
              label: 'Satellite-Enhanced',
              color: '#0066CC',
            },
          ].map(({ icon: Icon, value, label, color }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 py-3"
              style={{
                padding: '12px 16px',
                borderRight: i < 3 ? '1px solid #E5E7EB' : 'none',
              }}
            >
              <Icon size={20} style={{ color, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <p
                  className="data-value"
                  style={{ color, fontSize: '20px' }}
                >
                  {value}
                </p>
                <p style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
        {/* Full-screen map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ width: '100%', height: '100%' }}
          >
            {/* CartoDB Positron — clean, scientific map tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />
            {typedPins.map((pin) => {
              const color = gradeColor[pin.qualityGrade] ?? gradeColor.UNKNOWN;
              return (
                <CircleMarker
                  key={pin.locationId}
                  center={[pin.latitude, pin.longitude]}
                  radius={8}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', minWidth: '180px' }}>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: '6px' }}>
                        {pin.name}
                      </p>
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: color,
                          }}
                          aria-hidden="true"
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                          {gradeLabel[pin.qualityGrade] ?? pin.qualityGrade}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>
                        Score:{' '}
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1E3A5F' }}>
                          {pin.overallScore}/100
                        </span>
                      </p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                        {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                      </p>
                      {pin.satelliteData && (
                        <p style={{ fontSize: '11px', color: '#0066CC', marginTop: '4px' }}>
                          Satellite: {pin.satelliteData.source}
                        </p>
                      )}
                      <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px', borderTop: '1px solid #E5E7EB', paddingTop: '6px' }}>
                        Sign in to view full details
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Legend — bottom-left, white panel, 1px border */}
          <div
            className="absolute z-[1000]"
            style={{
              bottom: '16px',
              left: '16px',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              padding: '12px 16px',
              borderRadius: '4px',
              minWidth: '140px',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '8px' }}>
              Quality Grade
            </p>
            {Object.entries(gradeColor)
              .filter(([k]) => k !== 'UNKNOWN')
              .map(([grade, color]) => (
                <div key={grade} className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span style={{ fontSize: '12px', color: '#374151' }}>{gradeLabel[grade]}</span>
                </div>
              ))}
            <div className="flex items-center gap-2" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <Globe size={10} style={{ color: '#0066CC', flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: '11px', color: '#6B7280' }}>USGS · CMEMS · NASA</span>
            </div>
          </div>
        </div>

        {/* Right sidebar — location list */}
        <aside
          className="hidden lg:flex flex-col overflow-auto"
          style={{
            width: '300px',
            background: '#FFFFFF',
            borderLeft: '1px solid #D1D5DB',
          }}
        >
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #D1D5DB' }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              Monitoring Stations
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              {typedPins.length} active stations · quality grades only
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {typedPins.map((pin) => {
              const color = gradeColor[pin.qualityGrade] ?? gradeColor.UNKNOWN;
              return (
                <div
                  key={pin.locationId}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pin.name}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                    {gradeLabel[pin.qualityGrade] ?? pin.qualityGrade}
                  </span>
                </div>
              );
            })}

            {typedPins.length === 0 && (
              <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
                No monitoring stations configured
              </p>
            )}
          </div>

          <div
            className="flex-shrink-0 p-4"
            style={{ borderTop: '1px solid #D1D5DB', background: '#F9FAFB' }}
          >
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
              Sign in to access detailed readings, trend analysis, and compliance reports.
            </p>
            <Link
              to="/register"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: '#003F8A',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              Request Access
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
