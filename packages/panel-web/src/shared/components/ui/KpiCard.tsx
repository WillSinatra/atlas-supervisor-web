import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({ title, value, change, icon, className }: KpiCardProps) {
  const isPositive = change && change.value >= 0;

  return (
    <motion.div whileHover={{ y: -2 }} className={cn('card p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        {icon && <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{icon}</div>}
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={cn('font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
            {Math.abs(change.value)}%
          </span>
          <span className="text-slate-500">{change.label || 'vs. periodo anterior'}</span>
        </div>
      )}
    </motion.div>
  );
}