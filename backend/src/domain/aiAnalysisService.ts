import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../interfaces/middleware/errorMiddleware';

const SYSTEM_PROMPT = `You are an environmental regulator and water scientist. 
Analyze the provided water quality parameters against WHO 2022 and EU Water Framework Directive standards.
You MUST respond with ONLY valid JSON matching the exact schema provided. No markdown, no explanations outside JSON.`;

interface AIAnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  publicMessage: string;
  contaminants: Array<{
    parameter: string;
    value: number;
    unit: string;
    whoLimit?: number;
    euLimit?: number;
    exceedancePercent?: number;
  }>;
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    timeline: string;
  }>;
  trends: Array<{
    parameter: string;
    direction: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    changePercent: number;
  }>;
}

export async function triggerAIAnalysis(readingId: string, locationId: string): Promise<void> {
  if (!env.OPENROUTER_API_KEY) {
    logger.warn('OpenRouter API key not configured, skipping AI analysis');
    return;
  }

  const reading = await prisma.waterReading.findUnique({ where: { id: readingId } });
  if (!reading) throw new AppError(404, 'Reading not found');

  // Get 7 historical readings for trend context
  const history = await prisma.waterReading.findMany({
    where: { locationId, id: { not: readingId } },
    orderBy: { recordedAt: 'desc' },
    take: 7,
  });

  const prompt = buildAnalysisPrompt(reading, history);

  try {
    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://water-quality-sentinel.app',
        'X-Title': 'Water Quality Sentinel',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
    };

    const rawContent = data.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(rawContent) as AIAnalysisResult;

    await prisma.aIAnalysis.create({
      data: {
        readingId,
        locationId,
        riskLevel: parsed.riskLevel,
        summary: parsed.summary,
        publicMessage: parsed.publicMessage,
        contaminants: parsed.contaminants,
        recommendations: parsed.recommendations,
        trends: parsed.trends,
        rawResponse: rawContent,
        modelUsed: data.model ?? 'anthropic/claude-3-haiku',
      },
    });

    logger.info(`AI analysis completed for reading ${readingId}`);
  } catch (error) {
    logger.error('Failed to get AI analysis', error);
    throw error;
  }
}

function buildAnalysisPrompt(
  reading: {
    ph: number | null;
    turbidity: number | null;
    dissolvedOxygen: number | null;
    conductivity: number | null;
    temperature: number | null;
    nitrate: number | null;
    bacteria: number | null;
    overallScore: number;
    qualityGrade: string;
    recordedAt: Date;
  },
  history: Array<{
    ph: number | null;
    turbidity: number | null;
    dissolvedOxygen: number | null;
    overallScore: number;
    recordedAt: Date;
  }>,
): string {
  return `Analyze this water reading and respond with JSON only:

CURRENT READING (${reading.recordedAt.toISOString()}):
- pH: ${reading.ph ?? 'N/A'}
- Turbidity: ${reading.turbidity ?? 'N/A'} NTU
- Dissolved Oxygen: ${reading.dissolvedOxygen ?? 'N/A'} mg/L
- Conductivity: ${reading.conductivity ?? 'N/A'} µS/cm
- Temperature: ${reading.temperature ?? 'N/A'} °C
- Nitrate: ${reading.nitrate ?? 'N/A'} mg/L
- Bacteria: ${reading.bacteria ?? 'N/A'} CFU/100mL
- Overall Score: ${reading.overallScore}/100
- Grade: ${reading.qualityGrade}

HISTORICAL CONTEXT (last 7 readings):
${history.map((h, i) => `  ${i + 1}. Score: ${h.overallScore}, pH: ${h.ph ?? 'N/A'}, DO: ${h.dissolvedOxygen ?? 'N/A'}, Turbidity: ${h.turbidity ?? 'N/A'} (${h.recordedAt.toISOString()})`).join('\n')}

Respond with ONLY this JSON structure:
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "technical summary for scientists",
  "publicMessage": "plain language message for public",
  "contaminants": [{"parameter": "", "value": 0, "unit": "", "whoLimit": 0, "euLimit": 0, "exceedancePercent": 0}],
  "recommendations": [{"priority": "HIGH|MEDIUM|LOW", "action": "", "timeline": ""}],
  "trends": [{"parameter": "", "direction": "IMPROVING|STABLE|DETERIORATING", "changePercent": 0}]
}`;
}
