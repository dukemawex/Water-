import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserRole } from '../../types/enums';
import { rateLimiter } from '../middleware/rateLimiter';

export const alertRouter = Router();

alertRouter.get('/', rateLimiter('default'), authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
      locationId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const where = {
      ...(query.status && { status: query.status }),
      ...(query.locationId && { locationId: query.locationId }),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: { location: true, sensor: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items: alerts, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) },
      message: 'Alerts',
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

alertRouter.patch('/:id/acknowledge', rateLimiter('default'), authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST, UserRole.FIELD_OFFICER), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedById: req.user!.id },
    });
    res.json({ success: true, data: alert, message: 'Alert acknowledged', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

alertRouter.patch('/:id/resolve', rateLimiter('default'), authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { resolutionNote } = z.object({ resolutionNote: z.string().min(10) }).parse(req.body);
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: req.user!.id, resolutionNote },
    });
    res.json({ success: true, data: alert, message: 'Alert resolved', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});
