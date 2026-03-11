import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import { setupWebSocketServer } from './infrastructure/wsServer';
import { errorMiddleware } from './interfaces/middleware/errorMiddleware';
import { rateLimiter } from './interfaces/middleware/rateLimiter';
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

// API Routes
app.use('/api/auth', rateLimiter('auth'), authRouter);
app.use('/api/public', rateLimiter('default'), publicRouter);
app.use('/api/sensors', rateLimiter('default'), sensorRouter);
app.use('/api/readings', rateLimiter('default'), readingRouter);
app.use('/api/alerts', rateLimiter('default'), alertRouter);
app.use('/api/locations', rateLimiter('default'), locationRouter);
app.use('/api/reports', rateLimiter('ai'), reportRouter);
app.use('/api/satellite', rateLimiter('default'), satelliteRouter);

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
