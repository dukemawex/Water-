import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: number | null | undefined;
  unit: string;
  min?: number;
  max?: number;
  optimal?: { min: number; max: number };
  trend?: 'up' | 'down' | 'stable';
  satelliteValue?: number | null;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function ParameterCard({ label, value, unit, min = 0, max = 100, optimal, trend, satelliteValue }: Props) {
  const isInRange = value != null && optimal
    ? value >= optimal.min && value <= optimal.max
    : true;

  const pct = value != null ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0;
  const optMinPct = optimal ? clamp(((optimal.min - min) / (max - min)) * 100, 0, 100) : 0;
  const optMaxPct = optimal ? clamp(((optimal.max - min) / (max - min)) * 100, 0, 100) : 100;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-blue-400' : 'text-gray-400';

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        {trend && (
          <span className={`flex items-center gap-1 text-xs ${trendColor}`} aria-label={`Trend: ${trend}`}>
            <TrendIcon size={12} aria-hidden="true" />
            {trend}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className={`data-value text-2xl ${isInRange ? 'text-emerald-400' : 'text-amber-400'}`}>
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span className="text-gray-500 text-sm mb-0.5">{unit}</span>
      </div>

      {/* Safe range bar */}
      {optimal && (
        <div>
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            {/* Optimal zone */}
            <div
              className="absolute h-full bg-emerald-500/30 rounded-full"
              style={{ left: `${optMinPct}%`, width: `${optMaxPct - optMinPct}%` }}
              aria-hidden="true"
            />
            {/* Current value indicator */}
            {value != null && (
              <div
                className={`absolute h-full w-1 rounded-full ${isInRange ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{min}{unit}</span>
            <span className="text-emerald-600">Optimal: {optimal.min}–{optimal.max}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>
      )}

      {/* Satellite comparison */}
      {satelliteValue != null && (
        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-400 flex items-center gap-1">
              <span aria-hidden="true">🛰</span> Satellite
            </span>
            <span className="data-value text-sm text-blue-300">{satelliteValue.toFixed(1)} {unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}
