import { z } from 'zod';

// Construct DATABASE_URL from individual PG* variables injected by DigitalOcean App Platform
// when DATABASE_URL is not already set. This must run before Prisma client is instantiated.
if (!process.env.DATABASE_URL && process.env.PGHOST) {
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.PGUSER ?? '')}:${encodeURIComponent(process.env.PGPASSWORD ?? '')}@${process.env.PGHOST}:${process.env.PGPORT ?? '25060'}/${process.env.PGDATABASE ?? 'defaultdb'}?sslmode=require`;
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  console.error('---------------------------------------------------------');
  console.error('FATAL ERROR: Valid DATABASE_URL is missing.');
  console.error('Ensure the Managed Database is linked to the App Platform.');
  console.error('---------------------------------------------------------');
  process.exit(1);
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  NASA_EARTHDATA_TOKEN: z.string().optional(),
  COPERNICUS_CLIENT_ID: z.string().optional(),
  COPERNICUS_CLIENT_SECRET: z.string().optional(),
  USGS_WQP_BASE_URL: z.string().url().default('https://www.waterqualitydata.us'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_KEY_SECRET: z.string().min(16),
  PDF_OUTPUT_DIR: z.string().default('./reports'),

  // --- Satellite data feature flags ---
  // USGS NWIS real-time water quality (no key needed)
  USGS_NWIS_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // Copernicus Marine Environment Monitoring Service (CMEMS)
  CMEMS_USERNAME: z.string().optional(),
  CMEMS_PASSWORD: z.string().optional(),
  CMEMS_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // NASA Earthdata (MODIS/VIIRS)
  EARTHDATA_USERNAME: z.string().optional(),
  EARTHDATA_PASSWORD: z.string().optional(),
  EARTHDATA_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // OpenWeatherMap weather context
  OPENWEATHERMAP_API_KEY: z.string().optional(),
  OPENWEATHERMAP_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // European Environment Agency (no key needed)
  EEA_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // Email notifications (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // MQTT IoT sensors (optional)
  MQTT_BROKER_URL: z.string().optional(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // Redis cache (optional)
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.string().default('false').transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
