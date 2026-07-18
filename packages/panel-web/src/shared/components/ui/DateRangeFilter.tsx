import { Calendar } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  presets?: Array<{ label: string; days: number }>;
}

const defaultPresets = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Filtro único de rango de fecha, aplicado a toda la pantalla que lo use (no por gráfico individual).
export function DateRangeFilter({ value, onChange, presets = defaultPresets }: DateRangeFilterProps) {
  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ dateFrom: isoDate(from), dateTo: isoDate(to) });
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mr-1">
          <Calendar className="w-4 h-4" />
          <span>Período</span>
        </div>
        <Input
          type="date"
          label="Desde"
          value={value.dateFrom}
          max={value.dateTo}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
          className="w-40"
        />
        <Input
          type="date"
          label="Hasta"
          value={value.dateTo}
          min={value.dateFrom}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          className="w-40"
        />
        <div className="flex items-center gap-2 ml-auto">
          {presets.map((p) => (
            <Button key={p.days} type="button" variant="outline" size="sm" onClick={() => applyPreset(p.days)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
