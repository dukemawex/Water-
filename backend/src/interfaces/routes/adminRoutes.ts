/**
 * Admin routes — ingestion status, system health, etc.
 * All endpoints require ADMIN or SUPER_ADMIN role.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { getIngestionStatus } from '../../domain/dataIngestionScheduler';
import { UserRole } from '../../types/enums';

export const adminRouter = Router();

/**
 * GET /api/admin/ingestion-status
 * Returns the status of all scheduled data ingestion jobs.
 */
adminRouter.get(
  '/ingestion-status',
  rateLimiter('default'),
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const statuses = getIngestionStatus();
      res.json({
        success: true,
        data: statuses,
        message: 'Ingestion job statuses',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);
