import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { tareasApi } from '@/shared/services/tareas';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import type { DateRange } from '@/shared/components/ui/DateRangeFilter';

export function TasksInternasSection({ filters }: { filters: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tareas-internas', filters],
    queryFn: async () => {
      const res = await tareasApi.listar({
        todas: true,
        estado: 'hecha',
        desde: filters.dateFrom,
        hasta: filters.dateTo,
        per_page: 500,
      });
      
      const tareas = res.data || [];
      const byEmployee = new Map<string, { id: string; name: string; count: number }>();
      
      for (const t of tareas) {
        if (t.empleado?.id) {
          const entry = byEmployee.get(t.empleado.id) ?? {
            id: t.empleado.id,
            name: t.empleado.nombre || t.empleado.id,
            count: 0,
          };
          entry.count += 1;
          byEmployee.set(t.empleado.id, entry);
        }
      }
      
      return {
        total: tareas.length,
        byEmployee: [...byEmployee.values()].sort((a, b) => b.count - a.count),
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="card p-5 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-4">Tareas Internas Cerradas</h3>
        <EmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          title="Sin datos"
          description="No hay tareas internas cerradas en el período seleccionado."
        />
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tareas Internas Cerradas</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Total: {data.total} tareas completadas
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-300 dark:border-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Empleado</th>
              <th className="text-right px-4 py-2">Tareas</th>
              <th className="text-right px-4 py-2">Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {(data.byEmployee || []).map((emp) => {
              const porcentaje = ((emp.count / data.total) * 100).toFixed(1);
              return (
                <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-2 text-slate-900 dark:text-white">{emp.name}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white">
                    {emp.count}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">
                    {porcentaje}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
