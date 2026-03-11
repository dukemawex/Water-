/**
 * Copernicus Marine Environment Monitoring Service (CMEMS) Ingestion Service
 *
 * Fetches sea surface temperature and chlorophyll-a data every 6 hours.
 * Uses the Copernicus Marine REST API (previously called motu/OPeNDAP).
 * Registration: https://marine.copernicus.eu
 *
 * Feature flag: CMEMS_ENABLED=true
 * Credentials: CMEMS_USERNAME + CMEMS_PASSWORD
 */

import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

const CMEMS_TOKEN_URL =
  'https://marine.copernicus.eu/api/token';
// Copernicus Marine Toolbox REST API
const CMEMS_API_BASE = 'https://nrt.cmems-du.eu/thredds/dodsC';

interface CMEMSDataPoint {
  latitude: number;
  longitude: number;
  thetao?: number; // sea surface temperature (°C)
  chl?: number; // chlorophyll-a (mg/m³)
  so?: number; // salinity (PSU)
  capturedAt: string;
}

/**
 * Obtain a bearer token from the Copernicus Marine identity service.
 * The service uses HTTP Basic Auth to issue JWT tokens.
 */
async function getCmemsToken(): Promise<string | null> {
  if (!env.CMEMS_USERNAME || !env.CMEMS_PASSWORD) return null;

  try {
    const credentials = Buffer.from(
      `${env.CMEMS_USERNAME}:${env.CMEMS_PASSWORD}`,
    ).toString('base64');
    const response = await fetch(
      'https://marine.copernicus.eu/api/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      logger.warn(`[CMEMS] Token request failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { token?: string; access_token?: string };
    return data.token ?? data.access_token ?? null;
  } catch (err) {
    logger.error('[CMEMS] Token fetch error', err);
    return null;
  }
}

/**
 * Query the Copernicus Marine Catalogue for near-real-time global analysis products.
 * Dataset: GLOBAL_ANALYSISFORECAST_PHY_001_024 (temperature, salinity, currents)
 *
 * Uses the catalogue OData API — no token needed for discovery.
 */
async function queryGlobalAnalysisProducts(
  latitude: number,
  longitude: number,
): Promise<CMEMSDataPoint[]> {
  const results: CMEMSDataPoint[] = [];

  try {
    // Use the Copernicus Marine catalogue REST API (open metadata query)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const catalogueUrl =
      `https://catalogue.marine.copernicus.eu/api/products?` +
      `productId=GLOBAL_ANALYSISFORECAST_PHY_001_024&` +
      `latMin=${latitude - 0.25}&latMax=${latitude + 0.25}&` +
      `lonMin=${longitude - 0.25}&lonMax=${longitude + 0.25}&` +
      `startDate=${startDate}&endDate=${endDate}&` +
      `limit=5`;

    const response = await fetch(catalogueUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      // Catalogue endpoint may vary — log and return empty
      logger.debug(`[CMEMS] Catalogue query returned ${response.status}`);
      return results;
    }

    const data = (await response.json()) as {
      items?: Array<{ metadata?: { time?: string }; variables?: { thetao?: number; so?: number } }>;
    };

    for (const item of data.items ?? []) {
      results.push({
        latitude,
        longitude,
        thetao: item.variables?.thetao,
        so: item.variables?.so,
        capturedAt: item.metadata?.time ?? new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error('[CMEMS] Global analysis product query error', err);
  }

  return results;
}

/**
 * Query Copernicus Ocean Colour dataset for chlorophyll-a.
 * Dataset: OCEANCOLOUR_GLO_BGC_L4_MY_009_104
 */
async function queryOceanColourProducts(
  latitude: number,
  longitude: number,
): Promise<CMEMSDataPoint[]> {
  const results: CMEMSDataPoint[] = [];

  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const catalogueUrl =
      `https://catalogue.marine.copernicus.eu/api/products?` +
      `productId=OCEANCOLOUR_GLO_BGC_L4_MY_009_104&` +
      `latMin=${latitude - 0.25}&latMax=${latitude + 0.25}&` +
      `lonMin=${longitude - 0.25}&lonMax=${longitude + 0.25}&` +
      `startDate=${startDate}&endDate=${endDate}&` +
      `limit=5`;

    const response = await fetch(catalogueUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      logger.debug(`[CMEMS] Ocean colour query returned ${response.status}`);
      return results;
    }

    const data = (await response.json()) as {
      items?: Array<{ metadata?: { time?: string }; variables?: { chl?: number } }>;
    };

    for (const item of data.items ?? []) {
      results.push({
        latitude,
        longitude,
        chl: item.variables?.chl,
        capturedAt: item.metadata?.time ?? new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error('[CMEMS] Ocean colour product query error', err);
  }

  return results;
}

/** Store CMEMS data points as SatelliteReadings. */
async function storeCmemsReadings(
  locationId: string,
  points: CMEMSDataPoint[],
): Promise<number> {
  let saved = 0;
  for (const point of points) {
    try {
      const id = `cmems-${locationId}-${point.capturedAt}`;
      await prisma.satelliteReading.upsert({
        where: { id },
        create: {
          id,
          locationId,
          source: 'COPERNICUS_CMEMS',
          capturedAt: new Date(point.capturedAt),
          chlorophyllA: point.chl ?? null,
          surfaceTemperature: point.thetao ?? null,
          // Chlorophyll as proxy for turbidity (higher chl → higher turbidity)
          turbidityDerived: point.chl !== undefined ? point.chl * 2.5 : null,
          resolutionMeters: 4000,
          cloudCoverPercent: 0,
        },
        update: {
          chlorophyllA: point.chl ?? null,
          surfaceTemperature: point.thetao ?? null,
          turbidityDerived: point.chl !== undefined ? point.chl * 2.5 : null,
        },
      });
      saved++;
    } catch (err) {
      logger.warn(`[CMEMS] Failed to store reading for location ${locationId}`, err);
    }
  }
  return saved;
}

/** Public ingestion entry point — run this on schedule. */
export async function runCmemsIngestion(): Promise<void> {
  if (!env.CMEMS_ENABLED) {
    logger.debug('[CMEMS] CMEMS_ENABLED is false — skipping ingestion');
    return;
  }

  if (!env.CMEMS_USERNAME || !env.CMEMS_PASSWORD) {
    logger.warn('[CMEMS] CMEMS_USERNAME/PASSWORD not set — skipping ingestion');
    return;
  }

  logger.info('[CMEMS] Starting Copernicus Marine ingestion run');

  const locations = await prisma.location.findMany({
    where: { isPublic: true },
    select: { id: true, latitude: true, longitude: true, name: true },
    take: 20, // limit to first 20 to stay within free tier rate limits
  });

  let totalSaved = 0;
  let errors = 0;

  for (const loc of locations) {
    try {
      const [phyPoints, colourPoints] = await Promise.all([
        queryGlobalAnalysisProducts(loc.latitude, loc.longitude),
        queryOceanColourProducts(loc.latitude, loc.longitude),
      ]);

      const allPoints = [...phyPoints, ...colourPoints];
      if (allPoints.length === 0) continue;

      const saved = await storeCmemsReadings(loc.id, allPoints);
      totalSaved += saved;
      logger.debug(`[CMEMS] ${loc.name}: saved ${saved} readings`);
    } catch (err) {
      errors++;
      logger.error(`[CMEMS] Error ingesting location ${loc.id}`, err);
    }
  }

  logger.info(`[CMEMS] Ingestion complete — total saved: ${totalSaved}, errors: ${errors}`);
}
