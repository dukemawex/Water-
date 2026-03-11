import { CheckCircle, AlertCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import type { QualityGrade } from '@water-sentinel/shared';

interface Props {
  grade: QualityGrade | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const gradeConfig = {
  EXCELLENT: { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle },
  GOOD: { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', Icon: CheckCircle },
  FAIR: { label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', Icon: Minus },
  POOR: { label: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', Icon: AlertTriangle },
  CRITICAL: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-600/10 border-red-600/30', Icon: XCircle },
  UNKNOWN: { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', Icon: AlertCircle },
};

export default function QualityBadge({ grade, size = 'md', showIcon = true }: Props) {
  const config = gradeConfig[grade as keyof typeof gradeConfig] ?? gradeConfig.UNKNOWN;
  const { label, color, bg, Icon } = config;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${color} ${bg} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Water quality: ${label}`}
    >
      {showIcon && <Icon size={iconSize} aria-hidden="true" />}
      {label}
    </span>
  );
}
