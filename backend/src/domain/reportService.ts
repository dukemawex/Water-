import { prisma } from '../infrastructure/database';
import { logger } from '../config/logger';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

export async function generateLocationReport(locationId: string): Promise<string> {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new Error('Location not found');

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [readings, alerts, satelliteReadings] = await Promise.all([
    prisma.waterReading.findMany({
      where: { locationId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.alert.findMany({
      where: { locationId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.satelliteReading.findMany({
      where: { locationId, capturedAt: { gte: since } },
      orderBy: { capturedAt: 'desc' },
      take: 20,
    }),
  ]);

  const latestAI = await prisma.aIAnalysis.findFirst({
    where: { locationId },
    orderBy: { createdAt: 'desc' },
  });

  // Stats
  const scores = readings.map((r: { overallScore: number }) => r.overallScore);
  const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 0;

  // Generate AI narrative if API key is available
  let executiveSummary = latestAI?.summary ?? 'No AI analysis available for this period.';

  if (env.OPENROUTER_API_KEY) {
    try {
      executiveSummary = await generateAINarrative(location.name, readings.length, avgScore, alerts.length, executiveSummary);
    } catch (err) {
      logger.error('Failed to generate AI narrative for report', err);
    }
  }

  // Create PDF
  const outputDir = path.resolve(env.PDF_OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `report_${locationId}_${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);

  await writePDF(outputPath, {
    locationName: location.name,
    waterBodyType: location.waterBodyType,
    dateRange: { start: since, end: new Date() },
    readingCount: readings.length,
    avgScore,
    minScore,
    maxScore,
    alertCount: alerts.length,
    satelliteCount: satelliteReadings.length,
    executiveSummary,
    latestAI,
  });

  return outputPath;
}

async function generateAINarrative(
  locationName: string,
  readingCount: number,
  avgScore: number,
  alertCount: number,
  existingAnalysis: string,
): Promise<string> {
  const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'user',
          content: `Write a 3-paragraph executive summary for a water quality report for ${locationName}. 
          Data: ${readingCount} readings over 30 days, average score ${avgScore.toFixed(1)}/100, ${alertCount} alerts triggered.
          Latest AI analysis: ${existingAnalysis}
          Keep it professional and suitable for regulators.`,
        },
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? existingAnalysis;
}

interface ReportData {
  locationName: string;
  waterBodyType: string;
  dateRange: { start: Date; end: Date };
  readingCount: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  alertCount: number;
  satelliteCount: number;
  executiveSummary: string;
  latestAI: { recommendations: unknown; contaminants: unknown; riskLevel: string } | null;
}

function writePDF(outputPath: string, data: ReportData): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Water Quality Report', { align: 'center' });
    doc.fontSize(16).text(data.locationName, { align: 'center' });
    doc.fontSize(10).text(
      `${data.dateRange.start.toDateString()} — ${data.dateRange.end.toDateString()}`,
      { align: 'center' },
    );
    doc.moveDown(2);

    // Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
    doc.fontSize(11).font('Helvetica').text(data.executiveSummary, { align: 'justify' });
    doc.moveDown();

    // Statistics
    doc.fontSize(14).font('Helvetica-Bold').text('Statistical Overview');
    doc.fontSize(11).font('Helvetica');
    const stats = [
      ['Water Body Type', data.waterBodyType],
      ['Total Readings', data.readingCount.toString()],
      ['Average Quality Score', `${data.avgScore.toFixed(1)}/100`],
      ['Minimum Score', `${data.minScore}/100`],
      ['Maximum Score', `${data.maxScore}/100`],
      ['Alerts Triggered', data.alertCount.toString()],
      ['Satellite Data Points', data.satelliteCount.toString()],
    ];

    for (const [key, value] of stats) {
      doc.text(`${key}: ${value}`);
    }

    doc.moveDown();

    // AI Risk Assessment
    if (data.latestAI) {
      doc.fontSize(14).font('Helvetica-Bold').text('AI Risk Assessment');
      doc.fontSize(11).font('Helvetica').text(`Risk Level: ${data.latestAI.riskLevel}`);
      doc.moveDown();
    }

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
