/**
 * Weather Context Service
 *
 * Fetches OpenWeatherMap current conditions for each monitored location
 * every 30 minutes. Weather provides important environmental context for
 * water quality readings (precipitation, runoff, wind-driven mixing).
 *
 * Feature flag: OPENWEATHERMAP_ENABLED=true
 * API key: OPENWEATHERMAP_API_KEY
 * Free tier: 1000 calls/day
 * Docs: https://openweathermap.org/current
 */

import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

const OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather';

interface OWMResponse {
  weather: Array<{ id: number; main: string; description: string }>;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  wind: { speed: number; deg: number; gust?: number };
  rain?: { '1h'?: number; '3h'?: number };
  clouds: { all: number };
  uvi?: number;
  visibility: number;
  dt: number;
  name: string;
}

interface WeatherContextData {
  locationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  precipitation1h: number;
  cloudCover: number;
  weatherMain: string;
  weatherDescription: string;
  visibility: number;
  recordedAt: Date;
}

async function fetchWeatherForLocation(
  latitude: number,
  longitude: number,
): Promise<OWMResponse | null> {
  const url =
    `${OWM_BASE}?lat=${latitude}&lon=${longitude}` +
    `&appid=${env.OPENWEATHERMAP_API_KEY}&units=metric`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      logger.warn(`[Weather] OpenWeatherMap returned ${response.status}`);
      return null;
    }

    return (await response.json()) as OWMResponse;
  } catch (err) {
    logger.error('[Weather] Fetch error', err);
    return null;
  }
}

/** Store weather context — uses an upsert on WeatherContext table. */
async function storeWeatherContext(ctx: WeatherContextData): Promise<void> {
  // Round to nearest 30-minute window for deduplication
  const windowMs = 30 * 60 * 1000;
  const windowStart = new Date(
    Math.floor(ctx.recordedAt.getTime() / windowMs) * windowMs,
  );

  await prisma.weatherContext.upsert({
    where: {
      locationId_windowStart: {
        locationId: ctx.locationId,
        windowStart,
      },
    },
    create: {
      locationId: ctx.locationId,
      windowStart,
      temperature: ctx.temperature,
      humidity: ctx.humidity,
      pressure: ctx.pressure,
      windSpeed: ctx.windSpeed,
      windDeg: ctx.windDeg,
      precipitation1h: ctx.precipitation1h,
      cloudCover: ctx.cloudCover,
      weatherMain: ctx.weatherMain,
      weatherDescription: ctx.weatherDescription,
      visibility: ctx.visibility,
      recordedAt: ctx.recordedAt,
    },
    update: {
      temperature: ctx.temperature,
      humidity: ctx.humidity,
      pressure: ctx.pressure,
      windSpeed: ctx.windSpeed,
      windDeg: ctx.windDeg,
      precipitation1h: ctx.precipitation1h,
      cloudCover: ctx.cloudCover,
      weatherMain: ctx.weatherMain,
      weatherDescription: ctx.weatherDescription,
      visibility: ctx.visibility,
      recordedAt: ctx.recordedAt,
    },
  });
}

/** Public ingestion entry point — run this on schedule. */
export async function runWeatherContextIngestion(): Promise<void> {
  if (!env.OPENWEATHERMAP_ENABLED) {
    logger.debug('[Weather] OPENWEATHERMAP_ENABLED is false — skipping');
    return;
  }

  if (!env.OPENWEATHERMAP_API_KEY) {
    logger.warn('[Weather] OPENWEATHERMAP_API_KEY not set — skipping');
    return;
  }

  logger.info('[Weather] Starting weather context ingestion run');

  const locations = await prisma.location.findMany({
    where: { isPublic: true },
    select: { id: true, latitude: true, longitude: true, name: true },
    take: 30, // free tier: 1000 calls/day — 30 locations × 48 runs/day = 1440, within limit
  });

  let saved = 0;
  let errors = 0;

  for (const loc of locations) {
    try {
      const weather = await fetchWeatherForLocation(loc.latitude, loc.longitude);
      if (!weather) { errors++; continue; }

      await storeWeatherContext({
        locationId: loc.id,
        temperature: weather.main.temp,
        humidity: weather.main.humidity,
        pressure: weather.main.pressure,
        windSpeed: weather.wind.speed,
        windDeg: weather.wind.deg,
        precipitation1h: weather.rain?.['1h'] ?? 0,
        cloudCover: weather.clouds.all,
        weatherMain: weather.weather[0]?.main ?? '',
        weatherDescription: weather.weather[0]?.description ?? '',
        visibility: weather.visibility,
        recordedAt: new Date(weather.dt * 1000),
      });

      saved++;
      logger.debug(`[Weather] ${loc.name}: weather saved`);
    } catch (err) {
      errors++;
      logger.error(`[Weather] Error for location ${loc.id}`, err);
    }
  }

  logger.info(`[Weather] Run complete — saved: ${saved}, errors: ${errors}`);
}

/** Get the latest weather context for a location. */
export async function getWeatherContext(locationId: string) {
  return prisma.weatherContext.findFirst({
    where: { locationId },
    orderBy: { recordedAt: 'desc' },
  });
}

/** Get weather context over the last N days for a location. */
export async function getWeatherContextHistory(locationId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.weatherContext.findMany({
    where: { locationId, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'desc' },
    take: 200,
  });
}
