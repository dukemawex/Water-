import { Satellite, RefreshCw, AlertCircle } from 'lucide-react';
import { useSatelliteSummary } from '../../hooks/useSatellite';
import { apiFetch } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  locationId: string;
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

export default function SatelliteDataPanel({ locationId }: Props) {
  const { data: summary, isLoading, error } = useSatelliteSummary(locationId);
  const qc = useQueryClient();

  const handleRefresh = async () => {
    await apiFetch(`/locations/${locationId}/fetch-satellite`, { method: 'POST' });
    setTimeout(() => qc.invalidateQueries({ queryKey: ['satellite-summary', locationId] }), 3000);
  };

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Satellite size={16} style={{ color: '#0066CC' }} aria-hidden="true" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Satellite Data</span>
        </div>
        <button
          onClick={() => void handleRefresh()}
          style={{ color: '#6B7280', cursor: 'pointer', background: 'none', border: 'none', padding: '2px' }}
          title="Refresh satellite data"
          aria-label="Refresh satellite data"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {isLoading && (
        <div style={{ fontSize: '12px', color: '#9CA3AF', padding: '16px 0', textAlign: 'center' }}>
          Loading satellite data...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#B45309' }}>
          <AlertCircle size={14} aria-hidden="true" />
          <span>Satellite data unavailable</span>
        </div>
      )}

      {summary != null && !isLoading && (
        <>
          {/* Sources */}
          <div className="mb-3">
            <p
              style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', marginBottom: '6px' }}
            >
              Data Sources
            </p>
            <div className="flex flex-wrap gap-1">
              {summary.sources?.map((src: string) => (
                <span
                  key={src}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '2px',
                    background: '#F0F9FF',
                    color: sourceColor[src] ?? '#0066CC',
                    border: `1px solid ${sourceColor[src] ?? '#0066CC'}30`,
                  }}
                >
                  <span
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: sourceColor[src] ?? '#0066CC', display: 'inline-block' }}
                    aria-hidden="true"
                  />
                  {sourceLabels[src] ?? src}
                </span>
              ))}
              {(!summary.sources?.length) && (
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No data collected yet</span>
              )}
            </div>
          </div>

          {/* Parameter grid */}
          <div className="grid grid-cols-2 gap-2">
            {summary.averages?.surfaceTemperature != null && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                }}
              >
                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Surface Temp</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px', color: '#1E3A5F' }}>
                  {(summary.averages.surfaceTemperature as number).toFixed(1)}
                  <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF', marginLeft: '2px' }}>°C</span>
                </p>
              </div>
            )}
            {summary.averages?.chlorophyllA != null && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                }}
              >
                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Chlorophyll-a</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px', color: '#1E3A5F' }}>
                  {(summary.averages.chlorophyllA as number).toFixed(2)}
                  <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF', marginLeft: '2px' }}>µg/L</span>
                </p>
              </div>
            )}
            {summary.averages?.turbidityDerived != null && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                }}
              >
                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Turbidity</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px', color: '#1E3A5F' }}>
                  {(summary.averages.turbidityDerived as number).toFixed(1)}
                  <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF', marginLeft: '2px' }}>NTU</span>
                </p>
              </div>
            )}
            {summary.averages?.ndwi != null && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                }}
              >
                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>NDWI</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px', color: '#1E3A5F' }}>
                  {(summary.averages.ndwi as number).toFixed(3)}
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#9CA3AF',
              paddingTop: '8px',
              marginTop: '8px',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            {summary.totalDataPoints ?? 0} data points · USGS WQP · NASA MODIS · ESA Copernicus
          </div>
        </>
      )}
    </div>
  );
}
