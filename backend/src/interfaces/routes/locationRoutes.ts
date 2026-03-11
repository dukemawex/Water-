import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../../types/enums';
import { fetchAllSatelliteData } from '../../domain/satelliteDataService';

export const locationRouter = Router();

locationRouter.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      include: { _count: { select: { readings: true, sensors: true, alerts: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: locations, message: 'Locations', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

locationRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        sensors: true,
        readings: { orderBy: { recordedAt: 'desc' }, take: 10 },
        alerts: { where: { status: 'ACTIVE' } },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
        satelliteReadings: { orderBy: { capturedAt: 'desc' }, take: 20 },
      },
    });
    if (!location) { res.status(404).json({ success: false, data: null, message: 'Not found', timestamp: new Date().toISOString() }); return; }
    res.json({ success: true, data: location, message: 'Location detail', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

locationRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      waterBodyType: z.enum(['RIVER', 'LAKE', 'RESERVOIR', 'WASTEWATER', 'GROUNDWATER', 'COASTAL', 'WETLAND']),
      isPublic: z.boolean().default(true),
      country: z.string().min(2),
      region: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const location = await prisma.location.create({ data });
    
    // Trigger initial satellite data fetch
    fetchAllSatelliteData(location.id, location.latitude, location.longitude)
      .catch((err) => console.error('Initial satellite fetch failed', err));

    res.status(201).json({ success: true, data: location, message: 'Location created', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

locationRouter.post('/:id/fetch-satellite', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const location = await prisma.location.findUnique({ where: { id: req.params.id } });
    if (!location) { res.status(404).json({ success: false, data: null, message: 'Not found', timestamp: new Date().toISOString() }); return; }
    
    // Trigger async fetch
    fetchAllSatelliteData(location.id, location.latitude, location.longitude)
      .catch((err) => console.error('Satellite fetch failed', err));

    res.json({ success: true, data: { locationId: location.id }, message: 'Satellite data fetch initiated', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});
