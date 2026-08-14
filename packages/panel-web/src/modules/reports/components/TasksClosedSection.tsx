import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { getTasksClosedIndex, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';

/** Índice general de tareas internas cerradas (Pedido 10), fuente: GET /v1/tareas. */
export function TasksClosedSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'tasks-closed', filters],
    queryFn: () => getTasksClosedIndex(filters),
  });

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tareas internas cerradas</h3>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : !data || data.total === 0 ? (
        <EmptyState
          icon={<ListChecks className="w-8 h-8" />}
          title="Sin tareas en el período"
          description="No se crearon tareas internas en el rango de fechas seleccionado."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:col-span-2 gap-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Abiertas</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{data.total - data.closed}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Cerradas / total</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                  {data.closed} / {data.total}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Tasa de cierre</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{data.rate}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Ítems promedio / tarea</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{data.avgItemsPerTask}</p>
              </div>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Abiertas', value: data.total - data.closed },
                      { name: 'Cerradas', value: data.closed },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    <Cell fill="hsl(45 93% 47%)" />
                    <Cell fill="hsl(142 71% 45%)" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Por área</p>
              {data.byArea.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin tareas dirigidas a un área en el período.</p>
              ) : (
                data.byArea.map((g) => (
                  <ProgressBar key={g.id} label={g.name} value={g.rate} sublabel={`${g.closed} de ${g.total} cerradas`} />
                ))
              )}
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Por empleado</p>
              {data.byEmployee.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin tareas con responsable asignado en el período.</p>
              ) : (
                data.byEmployee.map((g) => (
                  <ProgressBar key={g.id} label={g.name} value={g.rate} sublabel={`${g.closed} de ${g.total} cerradas`} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
