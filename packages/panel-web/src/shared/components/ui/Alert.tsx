import { cn } from '@/shared/utils/cn';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
}

const variants = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

export function Alert({ children, variant = 'info', title, onClose }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border', variants[variant])}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-sm opacity-90">{children}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}