import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { getProductivityReport, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { SimpleBarChart } from './SimpleBarChart';
import { cn } from '@/shared/utils/cn';

function formatMinutes(minutes: number) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function productivityTier(rate: number) {
  if (rate >= 90) return { label: '🟢', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
  if (rate >= 70) return { label: '🟡', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
  if (rate >= 50) return { label: '🟠', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' };
  return { label: '🔴', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
}

const BREAKDOWN_LABELS: Record<string, string> = {
  pendiente: 'Pendientes',
  asignada: 'Asignadas',
  aceptada: 'Aceptadas',
  en_proceso: 'En proceso',
  completada: 'Completadas',
  cancelada: 'Canceladas',
};

export function ProductivitySection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'productivity', filters],
    queryFn: () => getProductivityReport(filters),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const hasData = data && data.some((c) => c.totalOrders > 0);

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Productividad por cuadrilla</h3>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !hasData ? (
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="Sin órdenes en el período"
          description="Ninguna cuadrilla tuvo órdenes de trabajo creadas en el período seleccionado."
        />
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">OTs</th>
                  <th className="px-4 py-3">Completadas</th>
                  <th className="px-4 py-3">Tiempo promedio</th>
                  <th className="px-4 py-3">Productividad</th>
                </tr>
              </thead>
              <tbody>
                {data!.map((crew) => {
                  const tier = productivityTier(crew.productivityRate);
                  const isOpen = expanded === crew.id;
                  return (
                    <>
                      <tr
                        key={crew.id}
                        onClick={() => setExpanded(isOpen ? null : crew.id)}
                        className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{crew.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{crew.totalOrders}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{crew.completedOrders}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatMinutes(crew.averageTime)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs', tier.className)}>
                            {tier.label} {crew.productivityRate}%
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${crew.id}-detail`} className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                              {Object.entries(crew.breakdown).map(([estado, count]) => (
                                <div key={estado} className="rounded-lg bg-white dark:bg-slate-700/50 p-3 text-center">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{BREAKDOWN_LABELS[estado] ?? estado}</p>
                                  <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{count}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">OTs completadas por cuadrilla</p>
            <SimpleBarChart
              data={data!.map((c) => ({ label: c.name, value: c.completedOrders }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
