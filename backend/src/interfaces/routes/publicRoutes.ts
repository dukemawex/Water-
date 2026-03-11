import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database';
import { getLatestSatelliteReading } from '../../domain/satelliteDataService';
import { rateLimiter } from '../middleware/rateLimiter';

export const publicRouter = Router();

publicRouter.get('/map-data', rateLimiter('default'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      where: { isPublic: true },
      include: { readings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });

    const pins = await Promise.all(locations.map(async (loc) => {
      const latest = loc.readings[0];
      const satelliteData = await getLatestSatelliteReading(loc.id);
      return {
        locationId: loc.id,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        qualityGrade: latest?.qualityGrade ?? 'UNKNOWN',
        overallScore: latest?.overallScore ?? 0,
        lastReadingAt: latest?.recordedAt,
        satelliteData: satelliteData ? {
          source: satelliteData.source,
          chlorophyllA: satelliteData.chlorophyllA,
          turbidityDerived: satelliteData.turbidityDerived,
          capturedAt: satelliteData.capturedAt,
        } : undefined,
      };
    }));

    res.json({ success: true, data: pins, message: 'Map data', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

publicRouter.get('/location/:id', rateLimiter('default'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const location = await prisma.location.findUnique({
      where: { id, isPublic: true },
      include: {
        readings: { orderBy: { recordedAt: 'desc' }, take: 1 },
        alerts: { where: { status: 'ACTIVE' }, select: { id: true } },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!location) { res.status(404).json({ success: false, data: null, message: 'Location not found', timestamp: new Date().toISOString() }); return; }

    const satelliteData = await getLatestSatelliteReading(id);
    const latestReading = location.readings[0];
    const latestAI = location.aiAnalyses[0];

    res.json({
      success: true,
      data: {
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        waterBodyType: location.waterBodyType,
        latestReading: latestReading ? {
          qualityGrade: latestReading.qualityGrade,
          overallScore: latestReading.overallScore,
          ph: latestReading.ph,
          turbidity: latestReading.turbidity,
          dissolvedOxygen: latestReading.dissolvedOxygen,
          temperature: latestReading.temperature,
          recordedAt: latestReading.recordedAt,
        } : undefined,
        latestAIAnalysis: latestAI ? {
          publicMessage: latestAI.publicMessage,
          riskLevel: latestAI.riskLevel,
          recommendations: latestAI.recommendations,
        } : undefined,
        latestSatelliteData: satelliteData ? {
          source: satelliteData.source,
          capturedAt: satelliteData.capturedAt,
          chlorophyllA: satelliteData.chlorophyllA,
          turbidityDerived: satelliteData.turbidityDerived,
          ndwi: satelliteData.ndwi,
        } : undefined,
        activeAlertCount: location.alerts.length,
      },
      message: 'Location summary',
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});
