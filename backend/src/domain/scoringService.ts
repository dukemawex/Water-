import { QualityGrade } from '../types/enums';

export interface ReadingParams {
  ph?: number | null;
  turbidity?: number | null;
  dissolvedOxygen?: number | null;
  conductivity?: number | null;
  temperature?: number | null;
  nitrate?: number | null;
  bacteria?: number | null;
}

function scorePh(ph: number): number {
  if (ph >= 6.5 && ph <= 8.5) return 100;
  if (ph >= 6.0 && ph < 6.5) return 70 - (6.5 - ph) * 40;
  if (ph > 8.5 && ph <= 9.0) return 70 - (ph - 8.5) * 40;
  if (ph < 6.0) return Math.max(0, 50 - (6.0 - ph) * 25);
  return Math.max(0, 50 - (ph - 9.0) * 25);
}

function scoreDO(do_: number): number {
  if (do_ >= 6) return 100;
  if (do_ >= 4) return 60 + (do_ - 4) * 20;
  if (do_ >= 2) return 20 + (do_ - 2) * 20;
  return Math.max(0, do_ * 10);
}

function scoreTurbidity(ntu: number): number {
  if (ntu <= 1) return 100;
  if (ntu <= 5) return 80 - (ntu - 1) * 5;
  if (ntu <= 20) return 60 - (ntu - 5) * 2;
  if (ntu <= 50) return 30 - (ntu - 20) * 0.5;
  return Math.max(0, 15 - (ntu - 50) * 0.1);
}

function scoreBacteria(cfu: number): number {
  if (cfu === 0) return 100;
  if (cfu <= 10) return 90 - cfu * 2;
  if (cfu <= 100) return 70 - (cfu - 10) * 0.5;
  if (cfu <= 1000) return 25 - (cfu - 100) * 0.02;
  return Math.max(0, 5);
}

function scoreTemperature(temp: number): number {
  if (temp >= 10 && temp <= 20) return 100;
  if (temp > 20 && temp <= 25) return 80 - (temp - 20) * 4;
  if (temp >= 5 && temp < 10) return 80 - (10 - temp) * 4;
  if (temp > 25) return Math.max(0, 60 - (temp - 25) * 6);
  return Math.max(0, 60 - (5 - temp) * 6);
}

export function calculateOverallScore(params: ReadingParams): number {
  const scores: Array<[number, number]> = []; // [score, weight]

  if (params.ph != null) scores.push([scorePh(params.ph), 0.20]);
  if (params.dissolvedOxygen != null) scores.push([scoreDO(params.dissolvedOxygen), 0.25]);
  if (params.turbidity != null) scores.push([scoreTurbidity(params.turbidity), 0.20]);
  if (params.bacteria != null) scores.push([scoreBacteria(params.bacteria), 0.25]);
  if (params.temperature != null) scores.push([scoreTemperature(params.temperature), 0.10]);

  if (scores.length === 0) return 50;

  const totalWeight = scores.reduce((sum, [, w]) => sum + w, 0);
  const weightedSum = scores.reduce((sum, [s, w]) => sum + s * w, 0);
  return Math.round(weightedSum / totalWeight);
}

export function scoreToGrade(score: number): QualityGrade {
  if (score >= 80) return QualityGrade.EXCELLENT;
  if (score >= 60) return QualityGrade.GOOD;
  if (score >= 40) return QualityGrade.FAIR;
  if (score >= 20) return QualityGrade.POOR;
  return QualityGrade.CRITICAL;
}
