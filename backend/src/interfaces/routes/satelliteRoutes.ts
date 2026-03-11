import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware';
import { getSatelliteReadings, getLatestSatelliteReading, fetchAllSatelliteData } from '../../domain/satelliteDataService';
import { prisma } from '../../infrastructure/database';

export const satelliteRouter = Router();

satelliteRouter.get('/readings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, days } = z.object({
      locationId: z.string().uuid(),
      days: z.coerce.number().int().min(1).max(90).default(30),
    }).parse(req.query);

    const readings = await getSatelliteReadings(locationId, days);
    res.json({ success: true, data: readings, message: 'Satellite readings', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

satelliteRouter.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = z.object({ locationId: z.string().uuid() }).parse(req.query);
    const reading = await getLatestSatelliteReading(locationId);
    res.json({ success: true, data: reading, message: 'Latest satellite reading', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

satelliteRouter.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = z.object({ locationId: z.string().uuid() }).parse(req.query);
    const readings = await getSatelliteReadings(locationId, 30);

    const summary = {
      locationId,
      totalDataPoints: readings.length,
      sources: [...new Set(readings.map((r) => r.source))],
      latestReading: readings[0] ?? null,
      averages: {
        chlorophyllA: avg(readings.map((r) => r.chlorophyllA).filter((v): v is number => v != null)),
        turbidityDerived: avg(readings.map((r) => r.turbidityDerived).filter((v): v is number => v != null)),
        surfaceTemperature: avg(readings.map((r) => r.surfaceTemperature).filter((v): v is number => v != null)),
        ndwi: avg(readings.map((r) => r.ndwi).filter((v): v is number => v != null)),
      },
    };

    res.json({ success: true, data: summary, message: 'Satellite summary', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

// Scheduled satellite data refresh for all locations
satelliteRouter.post('/refresh-all', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({ select: { id: true, latitude: true, longitude: true } });
    
    // Trigger async fetches without awaiting
    locations.forEach((loc) => {
      fetchAllSatelliteData(loc.id, loc.latitude, loc.longitude)
        .catch((err) => console.error(`Satellite refresh failed for ${loc.id}:`, err));
    });

    res.json({ success: true, data: { locationsCount: locations.length }, message: 'Satellite refresh initiated for all locations', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
