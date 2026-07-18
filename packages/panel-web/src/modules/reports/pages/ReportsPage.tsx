import { useState } from 'react';
import { DateRangeFilter, type DateRange } from '@/shared/components/ui/DateRangeFilter';
import { CostsSection } from '../components/CostsSection';
import { SlaComplianceSection } from '../components/SlaComplianceSection';
import { ProductivitySection } from '../components/ProductivitySection';
import { RecurrencesSection } from '../components/RecurrencesSection';
import { SatisfactionSection } from '../components/SatisfactionSection';

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { dateFrom: isoDate(from), dateTo: isoDate(to) };
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>(defaultRange);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Análisis y métricas operativas
        </p>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      <CostsSection filters={range} />
      <SlaComplianceSection filters={range} />
      <ProductivitySection filters={range} />
      <RecurrencesSection filters={range} />
      <SatisfactionSection filters={range} />
    </div>
  );
}
