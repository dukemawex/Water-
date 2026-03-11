import { QualityGrade, AlertSeverity, AlertStatus, SatelliteSource } from './enums';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface IngestReadingRequest {
  sensorId: string;
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  conductivity?: number;
  temperature?: number;
  nitrate?: number;
  bacteria?: number;
  recordedAt?: string;
}

export interface PublicMapPin {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  qualityGrade: QualityGrade;
  overallScore: number;
  lastReadingAt?: string;
  /** Latest satellite-derived data for map overlay */
  satelliteData?: {
    source: SatelliteSource;
    chlorophyllA?: number;
    turbidityDerived?: number;
    capturedAt: string;
  };
}

export interface LocationPublicSummary {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waterBodyType: string;
  latestReading?: {
    qualityGrade: QualityGrade;
    overallScore: number;
    ph?: number;
    turbidity?: number;
    dissolvedOxygen?: number;
    temperature?: number;
    recordedAt: string;
  };
  latestAIAnalysis?: {
    publicMessage: string;
    riskLevel: AlertSeverity;
    recommendations: Array<{ priority: string; action: string }>;
  };
  latestSatelliteData?: {
    source: SatelliteSource;
    capturedAt: string;
    chlorophyllA?: number;
    turbidityDerived?: number;
    ndwi?: number;
  };
  activeAlertCount: number;
}

export interface TrendDataPoint {
  timestamp: string;
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  conductivity?: number;
  temperature?: number;
  nitrate?: number;
  bacteria?: number;
  overallScore?: number;
  /** Satellite-derived turbidity for overlay comparison */
  satelliteTurbidity?: number;
  /** Satellite chlorophyll-a */
  satelliteChlorophyllA?: number;
}

export interface AcknowledgeAlertRequest {
  note?: string;
}

export interface ResolveAlertRequest {
  resolutionNote: string;
}

export interface WSEvent {
  type: 'reading:new' | 'alert:created' | 'sensor:offline' | 'satellite:updated';
  payload: unknown;
  room?: string;
  timestamp: string;
}
