import { useState } from 'react';
import { DateRangeFilter, type DateRange } from '@/shared/components/ui/DateRangeFilter';
import { SlaComplianceSection } from '../components/SlaComplianceSection';
import { ProductivitySection } from '../components/ProductivitySection';
import { TasksClosedSection } from '../components/TasksClosedSection';
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

      {/*
        Costos del período (por cuadrilla / por material) está oculta a propósito:
        no hay endpoint de backend que devuelva precio unitario ni consumo de
        materiales por orden (ni en la API remota de producción ni en packages/api
        de este repo), así que mostrarla sería mock disfrazado de dato real.
        Reactivar cuando exista ese endpoint — ver <CostsSection /> y reportsService.ts.
      */}
      <SlaComplianceSection filters={range} />
      <ProductivitySection filters={range} />
      <TasksClosedSection filters={range} />
      <RecurrencesSection filters={range} />
      <SatisfactionSection filters={range} />
    </div>
  );
}
