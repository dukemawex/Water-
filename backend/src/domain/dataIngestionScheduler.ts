/**
 * Data Ingestion Scheduler
 *
 * Central cron scheduler that starts all data ingestion services on backend startup.
 * Each job is gated by its feature flag environment variable.
 *
 * Schedule summary:
 *   - USGS NWIS:        every 15 minutes
 *   - CMEMS:            every 6 hours
 *   - Weather context:  every 30 minutes
 *
 * Status endpoint: GET /api/admin/ingestion-status
 */

import cron from 'node-cron';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { runUsgsIngestion } from './usgsIngestionService';
import { runCmemsIngestion } from './cmemsIngestionService';
import { runWeatherContextIngestion } from './weatherContextService';

interface JobStatus {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: string | null;
  lastRecordsIngested: number;
  lastError: string | null;
  totalRuns: number;
}

const jobStatuses = new Map<string, JobStatus>();

function makeStatus(name: string, schedule: string, enabled: boolean): JobStatus {
  return {
    name,
    schedule,
    enabled,
    lastRun: null,
    nextRun: null,
    lastRecordsIngested: 0,
    lastError: null,
    totalRuns: 0,
  };
}

function updateStatus(
  key: string,
  update: Partial<Pick<JobStatus, 'lastRun' | 'lastRecordsIngested' | 'lastError' | 'totalRuns'>>,
): void {
  const existing = jobStatuses.get(key);
  if (existing) {
    Object.assign(existing, update);
  }
}

async function runWithTracking(
  key: string,
  fn: () => Promise<void>,
): Promise<void> {
  const status = jobStatuses.get(key);
  if (!status) return;

  status.lastRun = new Date();
  status.totalRuns++;
  status.lastError = null;

  try {
    await fn();
    logger.info(`[Scheduler] Job "${key}" completed successfully`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    status.lastError = msg;
    logger.error(`[Scheduler] Job "${key}" failed: ${msg}`);
  }
}

/** Initialise and start all ingestion cron jobs. */
export function startDataIngestionScheduler(): void {
  logger.info('[Scheduler] Starting data ingestion scheduler');

  // ── USGS NWIS ── every 15 minutes ──────────────────────────────────────────
  const usgsKey = 'usgs-nwis';
  jobStatuses.set(usgsKey, makeStatus('USGS NWIS', '*/15 * * * *', env.USGS_NWIS_ENABLED));

  cron.schedule('*/15 * * * *', () => {
    void runWithTracking(usgsKey, runUsgsIngestion);
  });

  if (env.USGS_NWIS_ENABLED) {
    logger.info('[Scheduler] USGS NWIS job scheduled — every 15 minutes');
    // Run immediately on startup
    void runWithTracking(usgsKey, runUsgsIngestion);
  }

  // ── CMEMS ── every 6 hours ─────────────────────────────────────────────────
  const cmemsKey = 'cmems';
  jobStatuses.set(cmemsKey, makeStatus('Copernicus CMEMS', '0 */6 * * *', env.CMEMS_ENABLED));

  cron.schedule('0 */6 * * *', () => {
    void runWithTracking(cmemsKey, runCmemsIngestion);
  });

  if (env.CMEMS_ENABLED) {
    logger.info('[Scheduler] CMEMS job scheduled — every 6 hours');
    void runWithTracking(cmemsKey, runCmemsIngestion);
  }

  // ── Weather Context ── every 30 minutes ────────────────────────────────────
  const weatherKey = 'weather-context';
  jobStatuses.set(
    weatherKey,
    makeStatus('OpenWeatherMap Context', '*/30 * * * *', env.OPENWEATHERMAP_ENABLED),
  );

  cron.schedule('*/30 * * * *', () => {
    void runWithTracking(weatherKey, runWeatherContextIngestion);
  });

  if (env.OPENWEATHERMAP_ENABLED) {
    logger.info('[Scheduler] Weather context job scheduled — every 30 minutes');
    void runWithTracking(weatherKey, runWeatherContextIngestion);
  }

  logger.info('[Scheduler] All jobs registered', {
    usgsEnabled: env.USGS_NWIS_ENABLED,
    cmemsEnabled: env.CMEMS_ENABLED,
    weatherEnabled: env.OPENWEATHERMAP_ENABLED,
  });
}

/** Return current status of all ingestion jobs (for admin endpoint). */
export function getIngestionStatus(): JobStatus[] {
  return Array.from(jobStatuses.values());
}
