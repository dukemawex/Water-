import { SatelliteSource } from './enums';

export interface SatelliteReading {
  id: string;
  locationId: string;
  source: SatelliteSource;
  /** ISO timestamp of when satellite captured this data */
  capturedAt: string;
  /** Chlorophyll-a concentration (µg/L) — indicator of algal blooms */
  chlorophyllA?: number;
  /** Total Suspended Solids (mg/L) — related to turbidity */
  totalSuspendedSolids?: number;
  /** Surface water temperature (°C) from thermal band */
  surfaceTemperature?: number;
  /** Turbidity derived from satellite reflectance (NTU) */
  turbidityDerived?: number;
  /** Normalized Difference Water Index (unitless, -1 to 1) */
  ndwi?: number;
  /** Cyanobacteria index (µg/L) */
  cyanobacteriaIndex?: number;
  /** Dissolved Organic Carbon proxy (mg/L) */
  dissolvedOrganicCarbon?: number;
  /** Raw spectral bands data as JSON */
  rawBands?: Record<string, number>;
  /** Satellite scene/tile identifier */
  sceneId?: string;
  /** Cloud cover percentage (0-100) */
  cloudCoverPercent?: number;
  /** Spatial resolution in meters */
  resolutionMeters?: number;
  createdAt: string;
}

export interface SatelliteDataRequest {
  locationId: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  source?: SatelliteSource;
}

export interface USGSWQPResult {
  ActivityIdentifier: string;
  ActivityStartDate: string;
  CharacteristicName: string;
  ResultMeasureValue: string;
  ResultMeasure_MeasureUnitCode: string;
  MonitoringLocationIdentifier: string;
  LatitudeMeasure: string;
  LongitudeMeasure: string;
  OrganizationIdentifier: string;
  OrganizationFormalName: string;
}

export interface NASAModisResult {
  latitude: number;
  longitude: number;
  date: string;
  chlorophyll?: number;
  turbidity?: number;
  sst?: number; // sea surface temperature
  ndwi?: number;
}

export interface SatelliteDataSummary {
  locationId: string;
  source: SatelliteSource;
  latestReading?: SatelliteReading;
  averages: {
    chlorophyllA?: number;
    turbidityDerived?: number;
    surfaceTemperature?: number;
    ndwi?: number;
  };
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  dataPointCount: number;
  dateRange: { start: string; end: string };
}
