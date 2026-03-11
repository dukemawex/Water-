import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { authenticate, authorize, authenticateApiKey } from '../middleware/authMiddleware';
import { UserRole } from '../../types/enums';
import { ingestReading } from '../../domain/sensorIngestionService';
import { broadcast } from '../../infrastructure/wsServer';

export const sensorRouter = Router();

const ingestSchema = z.object({
  sensorId: z.string().uuid(),
  ph: z.number().min(0).max(14).optional(),
  turbidity: z.number().min(0).optional(),
  dissolvedOxygen: z.number().min(0).optional(),
  conductivity: z.number().min(0).optional(),
  temperature: z.number().min(-10).max(100).optional(),
  nitrate: z.number().min(0).optional(),
  bacteria: z.number().min(0).optional(),
  recordedAt: z.string().datetime().optional(),
});

sensorRouter.post('/ingest', authenticateApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = ingestSchema.parse(req.body);
    const reading = await ingestReading(payload);
    res.status(201).json({ success: true, data: reading, message: 'Reading ingested', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

sensorRouter.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sensors = await prisma.sensor.findMany({ include: { location: true }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: sensors, message: 'Sensors list', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

sensorRouter.post('/calibrate', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FIELD_OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sensorId, notes } = z.object({ sensorId: z.string().uuid(), notes: z.string().optional() }).parse(req.body);
    const sensor = await prisma.sensor.update({
      where: { id: sensorId },
      data: {
        lastCalibrationAt: new Date(),
        nextCalibrationAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'ONLINE',
      },
    });
    res.json({ success: true, data: { sensor, notes }, message: 'Calibration logged', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

sensorRouter.patch('/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({ status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'FAULT']) }).parse(req.body);
    const sensor = await prisma.sensor.update({ where: { id: req.params.id }, data: { status } });
    if (status === 'OFFLINE' || status === 'FAULT') {
      broadcast('admin:all', { type: 'sensor:offline', payload: { sensorId: sensor.id, locationId: sensor.locationId, status }, timestamp: new Date().toISOString() });
    }
    res.json({ success: true, data: sensor, message: 'Sensor status updated', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});
