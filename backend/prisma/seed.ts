import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed admin user
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@watersentinel.io' },
    update: {},
    create: {
      email: 'admin@watersentinel.io',
      passwordHash: adminHash,
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
    },
  });

  // Seed locations
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc-thames-001' },
      update: {},
      create: {
        id: 'loc-thames-001',
        name: 'Thames River - Chelsea',
        description: 'Monitoring station at Chelsea Embankment',
        latitude: 51.4847,
        longitude: -0.1685,
        waterBodyType: 'RIVER',
        isPublic: true,
        country: 'UK',
        region: 'London',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc-windermere-001' },
      update: {},
      create: {
        id: 'loc-windermere-001',
        name: 'Lake Windermere - North',
        description: 'Northern monitoring point of England\'s largest natural lake',
        latitude: 54.4392,
        longitude: -2.9390,
        waterBodyType: 'LAKE',
        isPublic: true,
        country: 'UK',
        region: 'Cumbria',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc-severn-001' },
      update: {},
      create: {
        id: 'loc-severn-001',
        name: 'River Severn - Worcester',
        description: 'Monitoring station on the River Severn at Worcester',
        latitude: 52.1920,
        longitude: -2.2190,
        waterBodyType: 'RIVER',
        isPublic: true,
        country: 'UK',
        region: 'Worcestershire',
      },
    }),
  ]);

  // Seed sensors for each location
  for (const location of locations) {
    await prisma.sensor.upsert({
      where: { serialNumber: `SN-${location.id}-001` },
      update: {},
      create: {
        name: `Primary Sensor - ${location.name}`,
        serialNumber: `SN-${location.id}-001`,
        locationId: location.id,
        status: 'ONLINE',
        batteryLevel: 85,
        firmwareVersion: '2.4.1',
        lastCalibrationAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextCalibrationAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Seed global threshold configs
  const thresholds = [
    { parameter: 'ph', minValue: 6.5, maxValue: 8.5, criticalMinValue: 5.0, criticalMaxValue: 10.0 },
    { parameter: 'turbidity', maxValue: 4.0, criticalMaxValue: 20.0 },
    { parameter: 'dissolvedOxygen', minValue: 4.0, criticalMinValue: 2.0 },
    { parameter: 'bacteria', maxValue: 100, criticalMaxValue: 500 },
    { parameter: 'nitrate', maxValue: 50, criticalMaxValue: 100 },
    { parameter: 'temperature', minValue: 5.0, maxValue: 25.0, criticalMaxValue: 30.0 },
  ];

  for (const threshold of thresholds) {
    await prisma.thresholdConfig.upsert({
      where: { locationId_parameter: { locationId: null as unknown as string, parameter: threshold.parameter } },
      update: {},
      create: { ...threshold, isGlobal: true },
    }).catch(async () => {
      // If upsert fails due to null locationId, use create with findFirst check
      const existing = await prisma.thresholdConfig.findFirst({
        where: { parameter: threshold.parameter, isGlobal: true, locationId: null },
      });
      if (!existing) {
        await prisma.thresholdConfig.create({ data: { ...threshold, isGlobal: true } });
      }
    });
  }

  // Seed sample readings for demo
  const thamesLocation = locations[0];
  const thameSensor = await prisma.sensor.findFirst({ where: { locationId: thamesLocation.id } });
  if (thameSensor) {
    const sampleReadings = [
      { ph: 7.2, turbidity: 2.1, dissolvedOxygen: 8.5, temperature: 14.2, bacteria: 5, overallScore: 82, qualityGrade: 'EXCELLENT' as const },
      { ph: 7.1, turbidity: 3.2, dissolvedOxygen: 7.8, temperature: 15.1, bacteria: 12, overallScore: 74, qualityGrade: 'GOOD' as const },
      { ph: 6.9, turbidity: 5.1, dissolvedOxygen: 6.5, temperature: 16.0, bacteria: 45, overallScore: 61, qualityGrade: 'GOOD' as const },
    ];

    for (let i = 0; i < sampleReadings.length; i++) {
      const reading = sampleReadings[i];
      await prisma.waterReading.create({
        data: {
          sensorId: thameSensor.id,
          locationId: thamesLocation.id,
          ...reading,
          conductivity: 450,
          nitrate: 8.5,
          isAnomaly: false,
          recordedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('✅ Seed complete:', { admin: admin.email, locations: locations.length });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
