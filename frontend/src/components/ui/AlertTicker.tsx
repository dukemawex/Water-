import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  severity: string;
  locationName?: string;
}

interface Props {
  alerts: Alert[];
}

export default function AlertTicker({ alerts }: Props) {
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % alerts.length), 5000);
    return () => clearInterval(timer);
  }, [alerts.length]);

  if (!visible || alerts.length === 0) return null;

  const current = alerts[idx % alerts.length];

  return (
    <div
      className="bg-red-900/80 border-b border-red-700 px-4 py-2 flex items-center gap-3"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle size={16} className="text-red-400 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 overflow-hidden">
        <span className="text-red-200 text-sm font-medium animate-pulse">
          ⚠ ACTIVE ALERT
        </span>
        <span className="text-red-300 text-sm ml-2">
          {current.title}
          {current.locationName && <span className="text-red-400 ml-1">— {current.locationName}</span>}
        </span>
        {alerts.length > 1 && (
          <span className="text-red-500 text-xs ml-2">({idx + 1}/{alerts.length})</span>
        )}
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-red-400 hover:text-red-200 flex-shrink-0"
        aria-label="Dismiss alerts ticker"
      >
        <X size={16} />
      </button>
    </div>
  );
}
