import { UserRole, WaterBodyType, SensorStatus, QualityGrade, AlertStatus, AlertSeverity } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  waterBodyType: WaterBodyType;
  isPublic: boolean;
  country: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sensor {
  id: string;
  name: string;
  serialNumber: string;
  locationId: string;
  location?: Location;
  status: SensorStatus;
  batteryLevel?: number;
  firmwareVersion?: string;
  lastCalibrationAt?: string;
  nextCalibrationAt?: string;
  installedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaterReading {
  id: string;
  sensorId: string;
  locationId: string;
  sensor?: Sensor;
  location?: Location;
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  conductivity?: number;
  temperature?: number;
  nitrate?: number;
  bacteria?: number;
  overallScore: number;
  qualityGrade: QualityGrade;
  isAnomaly: boolean;
  recordedAt: string;
  createdAt: string;
}

export interface AIAnalysis {
  id: string;
  readingId: string;
  locationId: string;
  riskLevel: AlertSeverity;
  summary: string;
  publicMessage: string;
  contaminants: ContaminantInfo[];
  recommendations: Recommendation[];
  trends: TrendInfo[];
  rawResponse: string;
  modelUsed: string;
  createdAt: string;
}

export interface ContaminantInfo {
  parameter: string;
  value: number;
  unit: string;
  whoLimit?: number;
  euLimit?: number;
  exceedancePercent?: number;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  timeline: string;
}

export interface TrendInfo {
  parameter: string;
  direction: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  changePercent: number;
}

export interface Alert {
  id: string;
  locationId: string;
  sensorId?: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  acknowledgedAt?: string;
  acknowledgedById?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThresholdConfig {
  id: string;
  locationId?: string;
  parameter: string;
  minValue?: number;
  maxValue?: number;
  criticalMinValue?: number;
  criticalMaxValue?: number;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}
