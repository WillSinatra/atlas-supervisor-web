import { cn } from '@/shared/utils/cn';

type ProgressVariant = 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  label: string;
  value: number;
  sublabel?: string;
  className?: string;
}

function thresholdVariant(value: number): ProgressVariant {
  if (value >= 90) return 'success';
  if (value >= 70) return 'warning';
  return 'danger';
}

const barColors: Record<ProgressVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const textColors: Record<ProgressVariant, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

export function ProgressBar({ label, value, sublabel, className }: ProgressBarProps) {
  const variant = thresholdVariant(value);
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className={cn('font-semibold', textColors[variant])}>{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColors[variant])} style={{ width: `${clamped}%` }} />
      </div>
      {sublabel && <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>}
    </div>
  );
}
