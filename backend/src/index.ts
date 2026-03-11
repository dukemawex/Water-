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
import { setupAlertEscalationCron } from './domain/alertEscalationCron';

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

// Error handling
app.use(errorMiddleware);

// WebSocket
setupWebSocketServer(httpServer);

// Background jobs
setupAlertEscalationCron();

const PORT = env.PORT;
httpServer.listen(PORT, () => {
  logger.info(`Water Quality Sentinel backend running on port ${PORT}`);
});

export default app;
