/**
 * USGS National Water Information System (NWIS) Ingestion Service
 *
 * Polls the USGS Instantaneous Values (IV) REST API every 15 minutes.
 * No API key required — completely open data.
 * API docs: https://waterservices.usgs.gov/rest/IV-Service.html
 *
 * Parameter codes:
 *   00400 = pH
 *   00010 = Temperature (°C)
 *   00300 = Dissolved Oxygen (mg/L)
 *   63680 = Turbidity (FNU)
 *   00060 = Streamflow (ft³/s)
 */

import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

const NWIS_BASE = 'https://waterservices.usgs.gov/nwis/iv/';
const PARAMETER_CODES = ['00400', '00010', '00300', '63680', '00060'];
// US states to poll (can be expanded)
const TARGET_STATES = ['ca', 'tx', 'fl', 'ny', 'wa'];

interface NWISTimeSeries {
  name: string;
  values: Array<{ value: Array<{ value: string; dateTime: string; qualifiers: string[] }> }>;
  variable: { variableCode: Array<{ value: string }>; variableName: string; unit: { unitCode: string } };
  sourceInfo: {
    siteName: string;
    siteCode: Array<{ value: string; agencyCode: string }>;
    geoLocation: { geogLocation: { latitude: number; longitude: number } };
  };
}

interface NWISResponse {
  value?: {
    timeSeries?: NWISTimeSeries[];
  };
}

/** Map USGS parameter code to WaterReading field */
function paramCodeToField(code: string): string | null {
  const map: Record<string, string> = {
    '00400': 'ph',
    '00010': 'temperature',
    '00300': 'dissolvedOxygen',
    '63680': 'turbidity',
  };
  return map[code] ?? null;
}

/** Upsert a Location record for a USGS site, returning the locationId. */
async function upsertUsgsLocation(
  siteCode: string,
  siteName: string,
  latitude: number,
  longitude: number,
): Promise<string> {
  const existing = await prisma.location.findFirst({
    where: { region: `USGS:${siteCode}` },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.location.create({
    data: {
      name: siteName.substring(0, 200),
      description: `Auto-created from USGS NWIS site ${siteCode}`,
      latitude,
      longitude,
      waterBodyType: 'RIVER',
      isPublic: true,
      country: 'US',
      region: `USGS:${siteCode}`,
    },
  });
  logger.info(`[USGS] Created location for site ${siteCode}: ${created.id}`);
  return created.id;
}

/** Fetch and ingest NWIS data for a given state. Returns count of readings saved. */
async function ingestState(stateCd: string): Promise<number> {
  const params = new URLSearchParams({
    format: 'json',
    stateCd,
    parameterCd: PARAMETER_CODES.join(','),
    siteStatus: 'active',
    siteType: 'ST,LK', // streams and lakes
  });

  const url = `${NWIS_BASE}?${params.toString()}`;
  logger.debug(`[USGS] Fetching ${url}`);

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'WaterQualitySentinel/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    logger.warn(`[USGS] NWIS returned ${response.status} for state ${stateCd}`);
    return 0;
  }

  const data = (await response.json()) as NWISResponse;
  const timeSeries = data.value?.timeSeries ?? [];

  // Group by site code → collect latest values
  const siteMap = new Map<
    string,
    {
      siteName: string;
      latitude: number;
      longitude: number;
      params: Record<string, { value: number; dateTime: string }>;
    }
  >();

  for (const ts of timeSeries) {
    const siteCode = ts.sourceInfo.siteCode[0]?.value ?? '';
    if (!siteCode) continue;

    if (!siteMap.has(siteCode)) {
      siteMap.set(siteCode, {
        siteName: ts.sourceInfo.siteName,
        latitude: ts.sourceInfo.geoLocation.geogLocation.latitude,
        longitude: ts.sourceInfo.geoLocation.geogLocation.longitude,
        params: {},
      });
    }

    const paramCode = ts.variable.variableCode[0]?.value ?? '';
    const field = paramCodeToField(paramCode);
    if (!field) continue;

    const latestValue = ts.values[0]?.value[0];
    if (!latestValue) continue;

    const numValue = parseFloat(latestValue.value);
    if (!isNaN(numValue)) {
      siteMap.get(siteCode)!.params[field] = { value: numValue, dateTime: latestValue.dateTime };
    }
  }

  let saved = 0;
  for (const [siteCode, site] of siteMap.entries()) {
    if (Object.keys(site.params).length === 0) continue;

    try {
      const locationId = await upsertUsgsLocation(
        siteCode,
        site.siteName,
        site.latitude,
        site.longitude,
      );

      // Determine the most recent timestamp across all parameters
      const timestamps = Object.values(site.params).map((p) => new Date(p.dateTime));
      const recordedAt = new Date(Math.max(...timestamps.map((t) => t.getTime())));

      // Calculate a basic overall score from available parameters
      const ph = site.params['ph']?.value;
      const do_ = site.params['dissolvedOxygen']?.value;
      const turbidity = site.params['turbidity']?.value;

      let overallScore = 70; // default fair
      if (ph !== undefined && do_ !== undefined) {
        const phScore = ph >= 6.5 && ph <= 8.5 ? 100 : Math.max(0, 100 - Math.abs(ph - 7) * 20);
        const doScore = do_ >= 7 ? 100 : Math.max(0, (do_ / 7) * 100);
        const turbScore = turbidity !== undefined ? Math.max(0, 100 - turbidity * 2) : 70;
        overallScore = (phScore + doScore + turbScore) / 3;
      }

      const grade =
        overallScore >= 90
          ? 'EXCELLENT'
          : overallScore >= 75
            ? 'GOOD'
            : overallScore >= 55
              ? 'FAIR'
              : overallScore >= 35
                ? 'POOR'
                : 'CRITICAL';

      await prisma.waterReading.create({
        data: {
          sensorId: await getOrCreateSentinelSensor(locationId),
          locationId,
          ph: site.params['ph']?.value ?? null,
          temperature: site.params['temperature']?.value ?? null,
          dissolvedOxygen: site.params['dissolvedOxygen']?.value ?? null,
          turbidity: site.params['turbidity']?.value ?? null,
          overallScore,
          qualityGrade: grade as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL',
          recordedAt,
        },
      });
      saved++;
    } catch (err) {
      logger.warn(`[USGS] Failed to save reading for site ${siteCode}`, err);
    }
  }

  return saved;
}

/** Get or create a virtual "USGS NWIS" sensor for a location. */
const sensorCache = new Map<string, string>();
async function getOrCreateSentinelSensor(locationId: string): Promise<string> {
  if (sensorCache.has(locationId)) return sensorCache.get(locationId)!;

  const existing = await prisma.sensor.findFirst({
    where: { locationId, serialNumber: { startsWith: 'USGS-NWIS-' } },
    select: { id: true },
  });
  if (existing) {
    sensorCache.set(locationId, existing.id);
    return existing.id;
  }

  const created = await prisma.sensor.create({
    data: {
      name: 'USGS NWIS Virtual Sensor',
      serialNumber: `USGS-NWIS-${locationId}`,
      locationId,
      status: 'ONLINE',
    },
  });
  sensorCache.set(locationId, created.id);
  return created.id;
}

/** Public ingestion entry point — run this on schedule. */
export async function runUsgsIngestion(): Promise<void> {
  if (!env.USGS_NWIS_ENABLED) {
    logger.debug('[USGS] USGS_NWIS_ENABLED is false — skipping ingestion');
    return;
  }

  logger.info('[USGS] Starting NWIS ingestion run');
  let totalSaved = 0;
  let errors = 0;

  for (const state of TARGET_STATES) {
    try {
      const count = await ingestState(state);
      totalSaved += count;
      logger.info(`[USGS] State ${state.toUpperCase()}: saved ${count} readings`);
    } catch (err) {
      errors++;
      logger.error(`[USGS] Error ingesting state ${state}`, err);
    }
  }

  logger.info(`[USGS] Ingestion complete — total saved: ${totalSaved}, errors: ${errors}`);
}
