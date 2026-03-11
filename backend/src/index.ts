import path from 'path';
import { env } from './config/env';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { logger } from './config/logger';
import { setupWebSocketServer } from './infrastructure/wsServer';
import { errorMiddleware } from './interfaces/middleware/errorMiddleware';
import { authRouter } from './interfaces/routes/authRoutes';
import { publicRouter } from './interfaces/routes/publicRoutes';
import { sensorRouter } from './interfaces/routes/sensorRoutes';
import { readingRouter } from './interfaces/routes/readingRoutes';
import { alertRouter } from './interfaces/routes/alertRoutes';
import { locationRouter } from './interfaces/routes/locationRoutes';
import { reportRouter } from './interfaces/routes/reportRoutes';
import { satelliteRouter } from './interfaces/routes/satelliteRoutes';
import { adminRouter } from './interfaces/routes/adminRoutes';
import { setupAlertEscalationCron } from './domain/alertEscalationCron';
import { startDataIngestionScheduler } from './domain/dataIngestionScheduler';

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// CSRF protection: validate Origin header on state-mutating requests that use cookies
app.use((req: Request, res: Response, next: NextFunction) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutating.includes(req.method)) return next();
  // Skip for sensor ingest (uses API key, not cookies)
  if (req.path === '/api/sensors/ingest') return next();
  const origin = req.headers.origin;
  if (origin && origin !== env.FRONTEND_URL) {
    res.status(403).json({ success: false, data: null, message: 'Forbidden: invalid origin', timestamp: new Date().toISOString() });
    return;
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy', uptime: process.uptime() },
    message: 'Service is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes — rate limiting applied per-router
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/sensors', sensorRouter);
app.use('/api/readings', readingRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/locations', locationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/satellite', satelliteRouter);
app.use('/api/admin', adminRouter);

// Error handling
app.use(errorMiddleware);

// Serve React frontend static files (after API routes)
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// Catch-all: serve React app for any non-API route (SPA routing)
app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).end();
    }
  });
});

// WebSocket
setupWebSocketServer(httpServer);

// Background jobs
setupAlertEscalationCron();
startDataIngestionScheduler();

const PORT = env.PORT;
httpServer.listen(PORT, () => {
  logger.info(`Water Quality Sentinel backend running on port ${PORT}`);
});

export default app;
