import { Satellite, RefreshCw, AlertCircle } from 'lucide-react';
import { useSatelliteSummary } from '../../hooks/useSatellite';
import { apiFetch } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  locationId: string;
}

const sourceLabels: Record<string, string> = {
  USGS_WQP: 'USGS Water Quality Portal',
  NASA_MODIS: 'NASA MODIS (Aqua/Terra)',
  COPERNICUS_SENTINEL2: 'ESA Sentinel-2',
  COPERNICUS_SENTINEL3: 'ESA Sentinel-3',
};

export default function SatelliteDataPanel({ locationId }: Props) {
  const { data: summary, isLoading, error } = useSatelliteSummary(locationId);
  const qc = useQueryClient();

  const handleRefresh = async () => {
    await apiFetch(`/locations/${locationId}/fetch-satellite`, { method: 'POST' });
    setTimeout(() => qc.invalidateQueries({ queryKey: ['satellite-summary', locationId] }), 3000);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Satellite size={18} className="text-blue-400" aria-hidden="true" />
          <h3 className="font-semibold text-gray-200">Satellite Data</h3>
          <span className="text-xs text-gray-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Open Source
          </span>
        </div>
        <button
          onClick={() => void handleRefresh()}
          className="text-gray-400 hover:text-blue-400 transition-colors"
          title="Refresh satellite data"
          aria-label="Refresh satellite data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {isLoading && (
        <div className="text-gray-500 text-sm text-center py-4 animate-pulse">
          Loading satellite data...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle size={14} aria-hidden="true" />
          <span>Satellite data unavailable</span>
        </div>
      )}

      {summary != null && !isLoading && (
        <>
          {/* Sources */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Data Sources</p>
            <div className="flex flex-wrap gap-2">
              {summary.sources?.map((src: string) => (
                <span key={src} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                  🛰 {sourceLabels[src] ?? src}
                </span>
              ))}
              {(!summary.sources?.length) && (
                <span className="text-xs text-gray-600">No data collected yet</span>
              )}
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-2 gap-3">
            {summary.averages?.chlorophyllA != null && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Chlorophyll-a</p>
                <p className="data-value text-green-400 text-lg">
                  {summary.averages.chlorophyllA!.toFixed(2)}
                  <span className="text-gray-500 text-xs ml-1">µg/L</span>
                </p>
              </div>
            )}
            {summary.averages?.turbidityDerived != null && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Turbidity (derived)</p>
                <p className="data-value text-amber-400 text-lg">
                  {summary.averages.turbidityDerived!.toFixed(1)}
                  <span className="text-gray-500 text-xs ml-1">NTU</span>
                </p>
              </div>
            )}
            {summary.averages?.surfaceTemperature != null && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Surface Temp</p>
                <p className="data-value text-orange-400 text-lg">
                  {summary.averages.surfaceTemperature!.toFixed(1)}
                  <span className="text-gray-500 text-xs ml-1">°C</span>
                </p>
              </div>
            )}
            {summary.averages?.ndwi != null && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">NDWI</p>
                <p className="data-value text-blue-400 text-lg">
                  {summary.averages.ndwi!.toFixed(3)}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-600 pt-1 border-t border-gray-800">
            {summary.totalDataPoints ?? 0} data points •{' '}
            Sources: USGS WQP (open), NASA Earthdata, ESA Copernicus
          </div>
        </>
      )}
    </div>
  );
}
