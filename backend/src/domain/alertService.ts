import { prisma } from '../infrastructure/database';
import { broadcast } from '../infrastructure/wsServer';
import { logger } from '../config/logger';

interface ReadingRecord {
  id: string;
  locationId: string;
  sensorId: string;
  ph: number | null;
  turbidity: number | null;
  dissolvedOxygen: number | null;
  conductivity: number | null;
  temperature: number | null;
  nitrate: number | null;
  bacteria: number | null;
  qualityGrade: string;
  overallScore: number;
}

const PARAMETER_LABELS: Record<string, { label: string; unit: string }> = {
  ph: { label: 'pH', unit: '' },
  turbidity: { label: 'Turbidity', unit: 'NTU' },
  dissolvedOxygen: { label: 'Dissolved Oxygen', unit: 'mg/L' },
  conductivity: { label: 'Conductivity', unit: 'µS/cm' },
  temperature: { label: 'Temperature', unit: '°C' },
  nitrate: { label: 'Nitrate', unit: 'mg/L' },
  bacteria: { label: 'Bacteria', unit: 'CFU/100mL' },
};

export async function checkThresholdsAndAlert(
  reading: ReadingRecord,
  locationId: string,
): Promise<void> {
  const thresholds = await prisma.thresholdConfig.findMany({
    where: {
      OR: [
        { locationId, isGlobal: false },
        { isGlobal: true },
      ],
    },
  });

  for (const threshold of thresholds) {
    const paramKey = threshold.parameter as keyof ReadingRecord;
    const value = reading[paramKey] as number | null;
    if (value == null) continue;

    const isCritical =
      (threshold.criticalMinValue != null && value < threshold.criticalMinValue) ||
      (threshold.criticalMaxValue != null && value > threshold.criticalMaxValue);

    const isViolation =
      isCritical ||
      (threshold.minValue != null && value < threshold.minValue) ||
      (threshold.maxValue != null && value > threshold.maxValue);

    if (!isViolation) continue;

    const { label, unit } = PARAMETER_LABELS[threshold.parameter] ?? { label: threshold.parameter, unit: '' };
    const severity = isCritical ? 'CRITICAL' : (reading.qualityGrade === 'POOR' ? 'HIGH' : 'MEDIUM');
    const thresholdValue = isCritical
      ? (threshold.criticalMaxValue ?? threshold.criticalMinValue ?? 0)
      : (threshold.maxValue ?? threshold.minValue ?? 0);

    // Deduplication: check for existing active alert for same location/parameter
    const existing = await prisma.alert.findFirst({
      where: {
        locationId,
        parameter: threshold.parameter,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      logger.debug(`Alert already active for ${threshold.parameter} at location ${locationId}`);
      continue;
    }

    const alert = await prisma.alert.create({
      data: {
        locationId,
        sensorId: reading.sensorId,
        parameter: threshold.parameter,
        value,
        threshold: thresholdValue,
        severity,
        status: 'ACTIVE',
        title: `${label} threshold exceeded`,
        description: `${label} reading of ${value}${unit} exceeds ${isCritical ? 'critical ' : ''}threshold of ${thresholdValue}${unit}`,
      },
    });

    broadcast('admin:all', {
      type: 'alert:created',
      payload: alert,
      timestamp: new Date().toISOString(),
    });

    broadcast('public:all', {
      type: 'alert:created',
      payload: {
        locationId,
        severity: alert.severity,
        parameter: label,
        title: alert.title,
      },
      timestamp: new Date().toISOString(),
    });

    logger.warn(`Alert created: ${alert.title} at location ${locationId}`);
  }
}
