import { prisma } from '../infrastructure/database';
import { broadcast } from '../infrastructure/wsServer';
import { calculateOverallScore, scoreToGrade } from './scoringService';
import { triggerAIAnalysis } from './aiAnalysisService';
import { checkThresholdsAndAlert } from './alertService';
import { AppError } from '../interfaces/middleware/errorMiddleware';
import { QualityGrade } from '../types/enums';
import { logger } from '../config/logger';

export interface IngestPayload {
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

export async function ingestReading(payload: IngestPayload) {
  const sensor = await prisma.sensor.findUnique({
    where: { id: payload.sensorId },
    include: { location: true },
  });

  if (!sensor) throw new AppError(404, 'Sensor not found');
  if (sensor.status === 'OFFLINE' || sensor.status === 'FAULT') {
    throw new AppError(400, `Sensor is ${sensor.status}`);
  }

  const score = calculateOverallScore(payload);
  const grade = scoreToGrade(score);

  const isAnomaly = detectAnomaly(payload, grade);

  const reading = await prisma.waterReading.create({
    data: {
      sensorId: sensor.id,
      locationId: sensor.locationId,
      ph: payload.ph,
      turbidity: payload.turbidity,
      dissolvedOxygen: payload.dissolvedOxygen,
      conductivity: payload.conductivity,
      temperature: payload.temperature,
      nitrate: payload.nitrate,
      bacteria: payload.bacteria,
      overallScore: score,
      qualityGrade: grade,
      isAnomaly,
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
    },
    include: { sensor: true, location: true },
  });

  // Update sensor status to ONLINE since it just sent data
  await prisma.sensor.update({
    where: { id: sensor.id },
    data: { status: 'ONLINE', updatedAt: new Date() },
  });

  // Broadcast to WebSocket clients
  broadcast('public:all', {
    type: 'reading:new',
    payload: {
      readingId: reading.id,
      locationId: reading.locationId,
      locationName: reading.location.name,
      qualityGrade: reading.qualityGrade,
      overallScore: reading.overallScore,
      recordedAt: reading.recordedAt,
    },
    timestamp: new Date().toISOString(),
  });

  broadcast(`location:${sensor.locationId}`, {
    type: 'reading:new',
    payload: reading,
    timestamp: new Date().toISOString(),
  });

  // Threshold alerts
  await checkThresholdsAndAlert(reading, sensor.locationId);

  // Trigger AI analysis for poor/critical readings or anomalies
  const gradesToAnalyze: QualityGrade[] = [QualityGrade.POOR, QualityGrade.CRITICAL, QualityGrade.FAIR];
  if (gradesToAnalyze.includes(grade) || isAnomaly) {
    triggerAIAnalysis(reading.id, sensor.locationId).catch((err) =>
      logger.error('AI analysis failed', err),
    );
  }

  return reading;
}

function detectAnomaly(params: IngestPayload, grade: QualityGrade): boolean {
  if (grade === QualityGrade.CRITICAL) return true;
  if (params.ph != null && (params.ph < 4 || params.ph > 10)) return true;
  if (params.bacteria != null && params.bacteria > 500) return true;
  if (params.turbidity != null && params.turbidity > 100) return true;
  return false;
}
