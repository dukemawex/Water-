import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { authenticate } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';

export const readingRouter = Router();

readingRouter.get('/trend', rateLimiter('default'), authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      locationId: z.string().uuid(),
      period: z.enum(['daily', 'hourly']).default('daily'),
      days: z.coerce.number().int().min(1).max(90).default(30),
    }).parse(req.query);

    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
    const readings = await prisma.waterReading.findMany({
      where: { locationId: query.locationId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, ph: true, turbidity: true, dissolvedOxygen: true, conductivity: true, temperature: true, nitrate: true, bacteria: true, overallScore: true, qualityGrade: true },
    });

    const satelliteReadings = await prisma.satelliteReading.findMany({
      where: { locationId: query.locationId, capturedAt: { gte: since } },
      orderBy: { capturedAt: 'asc' },
      select: { capturedAt: true, turbidityDerived: true, chlorophyllA: true },
    });

    const data = readings.map((r) => {
      const satMatch = satelliteReadings.find(
        (s) => Math.abs(s.capturedAt.getTime() - r.recordedAt.getTime()) < 24 * 60 * 60 * 1000,
      );
      return {
        timestamp: r.recordedAt,
        ph: r.ph,
        turbidity: r.turbidity,
        dissolvedOxygen: r.dissolvedOxygen,
        conductivity: r.conductivity,
        temperature: r.temperature,
        nitrate: r.nitrate,
        bacteria: r.bacteria,
        overallScore: r.overallScore,
        qualityGrade: r.qualityGrade,
        satelliteTurbidity: satMatch?.turbidityDerived ?? null,
        satelliteChlorophyllA: satMatch?.chlorophyllA ?? null,
      };
    });

    res.json({ success: true, data, message: 'Trend data', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

readingRouter.get('/latest', rateLimiter('default'), authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = z.object({ locationId: z.string().uuid().optional() }).parse(req.query);
    const where = locationId ? { locationId } : {};
    const readings = await prisma.waterReading.findMany({
      where,
      include: { sensor: true, location: true },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: readings, message: 'Latest readings', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});
