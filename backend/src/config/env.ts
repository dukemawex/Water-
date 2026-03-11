import { z } from 'zod';

// Construct DATABASE_URL from individual PG* variables injected by DigitalOcean App Platform
// when DATABASE_URL is not already set. This must run before Prisma client is instantiated.
if (!process.env.DATABASE_URL && process.env.PGHOST) {
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.PGUSER ?? '')}:${encodeURIComponent(process.env.PGPASSWORD ?? '')}@${process.env.PGHOST}:${process.env.PGPORT ?? '25060'}/${process.env.PGDATABASE ?? 'defaultdb'}?sslmode=require`;
}

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Ensure the database component is linked in DigitalOcean App Platform or set DATABASE_URL manually.');
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
