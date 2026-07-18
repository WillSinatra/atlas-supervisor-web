import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { getSatisfactionReport, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { SimpleBarChart } from './SimpleBarChart';

export function SatisfactionSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'satisfaction', filters],
    queryFn: () => getSatisfactionReport(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Satisfacción del cliente</h3>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.totalRatings === 0 ? (
        <EmptyState
          icon={<Star className="w-8 h-8" />}
          title="Sin encuestas respondidas"
          description="No hay calificaciones de clientes en el período seleccionado."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KpiCard title="Promedio general" value={`${data.average.toFixed(1)} ★`} icon={<Star className="w-5 h-5" />} className="lg:col-span-1" />
          <div className="lg:col-span-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Distribución de calificaciones ({data.totalRatings} respuestas)
            </p>
            <SimpleBarChart
              data={[5, 4, 3, 2, 1].map((star) => ({ label: `${star}★`, value: data.distribution[star as 1 | 2 | 3 | 4 | 5] }))}
              valueFormatter={(v) => `${v} respuesta${v === 1 ? '' : 's'}`}
              height={200}
            />
          </div>
        </div>
      )}
    </div>
  );
}
