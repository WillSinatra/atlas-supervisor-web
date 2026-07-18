import { useQuery } from '@tanstack/react-query';
import { DollarSign, Wrench } from 'lucide-react';
import { getCostsReport, type ReportsFilters } from '@/shared/services/reportsService';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { SimpleBarChart } from './SimpleBarChart';

const currency = (v: number) => `$${v.toLocaleString('es-AR')}`;

export function CostsSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'costs', filters],
    queryFn: () => getCostsReport(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Costos del período</h3>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !data || data.byCrew.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="w-8 h-8" />}
          title="Sin costos registrados"
          description="No hay órdenes con costos asociados en el período seleccionado."
        />
      ) : (
        <>
          <KpiCard title="Costo total del período" value={currency(data.totalPeriod)} icon={<DollarSign className="w-5 h-5" />} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Por cuadrilla</p>
              <SimpleBarChart data={data.byCrew.map((c) => ({ label: c.name, value: c.total }))} valueFormatter={currency} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Por material
              </p>
              <div className="space-y-2">
                {data.byMaterial.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                  >
                    <span className="text-slate-600 dark:text-slate-300">{m.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{currency(m.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
