import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { broadcast } from '../infrastructure/wsServer';

interface USGSWQPRecord {
  ActivityStartDate: string;
  CharacteristicName: string;
  ResultMeasureValue: string;
  ResultMeasure_MeasureUnitCode: string;
  MonitoringLocationIdentifier: string;
}

interface USGSWQPResponse {
  features?: Array<{
    properties: USGSWQPRecord;
  }>;
}

/**
 * Fetch data from USGS Water Quality Portal (completely open, no auth required).
 * API docs: https://www.waterqualitydata.us/webservices_documentation/
 */
export async function fetchUSGSWaterQualityData(
  latitude: number,
  longitude: number,
  locationId: string,
  withinKm = 25,
): Promise<void> {
  const withinMiles = (withinKm * 0.621371).toFixed(1);
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    lat: latitude.toString(),
    long: longitude.toString(),
    within: withinMiles,
    startDateLo: startDate,
    startDateHi: endDate,
    characteristicName: 'pH,Turbidity,Dissolved oxygen (DO),Temperature, water,Nitrate',
    mimeType: 'geojson',
    dataProfile: 'resultPhysChem',
  });

  const url = `${env.USGS_WQP_BASE_URL}/data/Result/search?${params.toString()}`;

  try {
    logger.debug(`Fetching USGS WQP data from: ${url}`);
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      logger.warn(`USGS WQP returned ${response.status}`);
      return;
    }

    const data = await response.json() as USGSWQPResponse;
    const features = data.features ?? [];

    if (features.length === 0) {
      logger.debug(`No USGS WQP data found for location ${locationId}`);
      return;
    }

    // Parse and store satellite/ground readings
    const grouped = new Map<string, Array<USGSWQPRecord>>();
    for (const feature of features) {
      const date = feature.properties.ActivityStartDate;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(feature.properties);
    }

    for (const [date, records] of Array.from(grouped.entries()).slice(0, 10)) {
      const params: Record<string, number> = {};
      for (const record of records) {
        const value = parseFloat(record.ResultMeasureValue);
        if (isNaN(value)) continue;
        const name = record.CharacteristicName.toLowerCase();
        if (name.includes('ph')) params['ph'] = value;
        else if (name.includes('turbidity')) params['turbidityDerived'] = value;
        else if (name.includes('dissolved oxygen')) params['dissolvedOxygen'] = value;
        else if (name.includes('temperature')) params['surfaceTemperature'] = value;
        else if (name.includes('nitrate')) params['nitrate'] = value;
      }

      await prisma.satelliteReading.upsert({
        where: {
          id: `usgs-${locationId}-${date}`,
        },
        create: {
          id: `usgs-${locationId}-${date}`,
          locationId,
          source: 'USGS_WQP',
          capturedAt: new Date(date),
          turbidityDerived: params['turbidityDerived'],
          surfaceTemperature: params['surfaceTemperature'],
          resolutionMeters: 0, // ground-based (not satellite imagery)
        },
        update: {
          turbidityDerived: params['turbidityDerived'],
          surfaceTemperature: params['surfaceTemperature'],
        },
      });
    }

    broadcast('public:all', {
      type: 'satellite:updated',
      payload: { locationId, source: 'USGS_WQP', count: features.length },
      timestamp: new Date().toISOString(),
    });

    logger.info(`Stored ${Math.min(features.length, 10)} USGS WQP records for location ${locationId}`);
  } catch (error) {
    logger.error('Failed to fetch USGS WQP data', error);
  }
}

/**
 * Fetch Copernicus/Sentinel-3 Water Quality Products via Copernicus Marine Service.
 * Uses the free CMEMS (Copernicus Marine Environment Monitoring Service) open API.
 * Documentation: https://marine.copernicus.eu/
 */
export async function fetchCopernicusSentinelData(
  latitude: number,
  longitude: number,
  locationId: string,
): Promise<void> {
  if (!env.COPERNICUS_CLIENT_ID || !env.COPERNICUS_CLIENT_SECRET) {
    logger.debug('Copernicus credentials not configured, skipping Sentinel fetch');
    return;
  }

  try {
    // Get OAuth2 token from Copernicus Identity Service
    const tokenResponse = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.COPERNICUS_CLIENT_ID,
        client_secret: env.COPERNICUS_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenResponse.ok) {
      logger.warn(`Copernicus auth failed: ${tokenResponse.status}`);
      return;
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    const token = tokenData.access_token;

    // Query Sentinel-3 OLCI Water Quality Products
    const minLon = longitude - 0.1;
    const minLat = latitude - 0.1;
    const maxLon = longitude + 0.1;
    const maxLat = latitude + 0.1;
    // Proper closed POLYGON WKT: (minLon minLat, maxLon minLat, maxLon maxLat, minLon maxLat, minLon minLat)
    const polygonWkt = `${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}`;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const searchUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?` +
      `$filter=Collection/Name eq 'SENTINEL-3' and ` +
      `OData.CSC.Intersects(area=geography'SRID=4326;POLYGON((${polygonWkt}))')` +
      ` and ContentDate/Start gt ${startDate}T00:00:00.000Z` +
      ` and ContentDate/Start lt ${endDate}T23:59:59.999Z&$top=5`;

    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!searchResponse.ok) {
      logger.warn(`Copernicus catalogue search failed: ${searchResponse.status}`);
      return;
    }

    const searchData = await searchResponse.json() as {
      value: Array<{ Id: string; Name: string; ContentDate: { Start: string }; Footprint: string }>;
    };

    for (const product of searchData.value.slice(0, 3)) {
      await prisma.satelliteReading.upsert({
        where: { id: `sentinel3-${locationId}-${product.Id}` },
        create: {
          id: `sentinel3-${locationId}-${product.Id}`,
          locationId,
          source: 'COPERNICUS_SENTINEL3',
          capturedAt: new Date(product.ContentDate.Start),
          sceneId: product.Id,
          resolutionMeters: 300, // Sentinel-3 OLCI resolution
          cloudCoverPercent: 0,
        },
        update: {},
      });
    }

    logger.info(`Stored ${Math.min(searchData.value.length, 3)} Sentinel-3 records for location ${locationId}`);
  } catch (error) {
    logger.error('Failed to fetch Copernicus Sentinel data', error);
  }
}

/**
 * Fetch NASA MODIS Aqua/Terra ocean color / water quality via NASA Earthdata OPeNDAP.
 * Uses the free NASA Earthdata API (token required but free to register).
 * Products: MODIS Aqua L3 daily - Chlorophyll-a, Remote Sensing Reflectance
 */
export async function fetchNASAModisData(
  latitude: number,
  longitude: number,
  locationId: string,
): Promise<void> {
  try {
    // Use NASA's EOSDIS CMR (Common Metadata Repository) - no auth required for search
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const searchUrl = `https://cmr.earthdata.nasa.gov/search/granules.json?` +
      `short_name=MODISA_L3m_CHL&` +
      `temporal=${startDate}T00:00:00Z,${endDate}T23:59:59Z&` +
      `bounding_box=${longitude - 0.5},${latitude - 0.5},${longitude + 0.5},${latitude + 0.5}&` +
      `page_size=5&sort_key=-start_date`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (env.NASA_EARTHDATA_TOKEN) {
      headers['Authorization'] = `Bearer ${env.NASA_EARTHDATA_TOKEN}`;
    }

    const response = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      logger.warn(`NASA CMR search failed: ${response.status}`);
      return;
    }

    const data = await response.json() as {
      feed: {
        entry: Array<{
          id: string;
          title: string;
          time_start: string;
          time_end: string;
          boxes?: string[];
        }>;
      };
    };

    const entries = data.feed?.entry ?? [];

    for (const entry of entries.slice(0, 3)) {
      await prisma.satelliteReading.upsert({
        where: { id: `modis-${locationId}-${entry.id}` },
        create: {
          id: `modis-${locationId}-${entry.id}`,
          locationId,
          source: 'NASA_MODIS',
          capturedAt: new Date(entry.time_start),
          sceneId: entry.id,
          resolutionMeters: 4000, // MODIS L3 4km resolution
          rawBands: { title: entry.title },
        },
        update: {},
      });
    }

    broadcast('public:all', {
      type: 'satellite:updated',
      payload: { locationId, source: 'NASA_MODIS', count: entries.length },
      timestamp: new Date().toISOString(),
    });

    logger.info(`Stored ${Math.min(entries.length, 3)} NASA MODIS records for location ${locationId}`);
  } catch (error) {
    logger.error('Failed to fetch NASA MODIS data', error);
  }
}

/**
 * Fetch all available satellite data for a location from all open sources.
 */
export async function fetchAllSatelliteData(
  locationId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  logger.info(`Fetching satellite data for location ${locationId} at (${latitude}, ${longitude})`);

  await Promise.allSettled([
    fetchUSGSWaterQualityData(latitude, longitude, locationId),
    fetchNASAModisData(latitude, longitude, locationId),
    fetchCopernicusSentinelData(latitude, longitude, locationId),
  ]);
}

/**
 * Get recent satellite readings for a location.
 */
export async function getSatelliteReadings(locationId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.satelliteReading.findMany({
    where: { locationId, capturedAt: { gte: since } },
    orderBy: { capturedAt: 'desc' },
    take: 100,
  });
}

/**
 * Get the latest satellite reading for a location from any source.
 */
export async function getLatestSatelliteReading(locationId: string) {
  return prisma.satelliteReading.findFirst({
    where: { locationId },
    orderBy: { capturedAt: 'desc' },
  });
}
