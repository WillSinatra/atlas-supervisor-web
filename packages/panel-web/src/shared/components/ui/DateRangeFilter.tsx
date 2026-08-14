import { Calendar } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  presets?: Array<{ label: string; days: number }>;
  disabled?: boolean;
}

const defaultPresets = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isActivePreset(value: DateRange, days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return value.dateTo === isoDate(to) && value.dateFrom === isoDate(from);
}

// Filtro único de rango de fecha, aplicado a toda la pantalla que lo use (no por gráfico individual).
// Compacto: todo en una sola fila (~44px de alto).
export function DateRangeFilter({ value, onChange, presets = defaultPresets, disabled = false }: DateRangeFilterProps) {
  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ dateFrom: isoDate(from), dateTo: isoDate(to) });
  };

  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Calendar className="w-4 h-4" />
        <span className="font-medium whitespace-nowrap">Período</span>
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      <div className="flex items-center gap-1.5">
        <label htmlFor="date-range-from" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Desde:
        </label>
        <input
          id="date-range-from"
          type="date"
          value={value.dateFrom}
          max={value.dateTo}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
          className="input h-8 px-2 py-1 text-sm w-[140px]"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <label htmlFor="date-range-to" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Hasta:
        </label>
        <input
          id="date-range-to"
          type="date"
          value={value.dateTo}
          min={value.dateFrom}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          className="input h-8 px-2 py-1 text-sm w-[140px]"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {presets.map((p) => {
          const active = isActivePreset(value, p.days);
          return (
            <button
              key={p.days}
              type="button"
              disabled={disabled}
              onClick={() => applyPreset(p.days)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed',
                active
                  ? 'bg-atlas-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
