import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { getProductivityReport, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';

function formatMinutes(minutes: number) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ProductivitySection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'productivity', filters],
    queryFn: () => getProductivityReport(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Productividad por cuadrilla</h3>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data || !data.some((c) => c.completedOrders > 0) ? (
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="Sin OTs cerradas"
          description="Ninguna cuadrilla cerró órdenes de trabajo en el período seleccionado."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Cuadrilla</th>
                <th className="px-4 py-3">OTs cerradas</th>
                <th className="px-4 py-3">Tiempo promedio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((crew) => (
                <tr key={crew.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{crew.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{crew.completedOrders}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatMinutes(crew.averageTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
