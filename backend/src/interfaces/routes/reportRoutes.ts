import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../../types/enums';
import { generateLocationReport } from '../../domain/reportService';
import { rateLimiter } from '../middleware/rateLimiter';
import path from 'path';
import fs from 'fs';

export const reportRouter = Router();

reportRouter.post('/generate/:locationId', rateLimiter('ai'), authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REGULATOR, UserRole.ANALYST), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outputPath = await generateLocationReport(req.params.locationId);
    const filename = path.basename(outputPath);
    res.json({ success: true, data: { filename, path: `/api/reports/download/${filename}` }, message: 'Report generated', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

reportRouter.get('/download/:filename', rateLimiter('default'), authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const safeName = path.basename(req.params.filename);
    const filePath = path.resolve(process.env.PDF_OUTPUT_DIR ?? './reports', safeName);
    if (!fs.existsSync(filePath)) { res.status(404).json({ success: false, data: null, message: 'Report not found', timestamp: new Date().toISOString() }); return; }
    res.download(filePath);
  } catch (err) { next(err); }
});
