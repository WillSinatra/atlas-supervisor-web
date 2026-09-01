import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getTasksClosedIndex, type ReportsFilters } from '@/shared/services/reportsService';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Skeleton } from '@/shared/components/ui/Skeleton';

const COLORS = ['#10b981', '#fbbf24', '#ef4444']; // Verde, Amarillo, Rojo

export function TasksClosedSection({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'tasks-closed', filters],
    queryFn: () => getTasksClosedIndex(filters),
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
        <h3 className="text-lg font-semibold mb-4">Reclamos Internos Cerrados</h3>
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="Sin datos"
          description="No hay reclamos cerrados en el período seleccionado."
        />
      </div>
    );
  }

  // Preparar datos para Pie Chart (por área)
  console.log('TasksClosedSection data:', data);
  console.log('TasksClosedSection data:', data);
  const areaChartData = (data.byArea || []).map((item, idx) => ({
    name: item.name,
    value: item.closed,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <div className="card p-5 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reclamos Internos Cerrados</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Total: {data.total} reclamos en el período
        </p>
      </div>

      {/* Pie Chart por Área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Por Área</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={areaChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {areaChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla por Empleado */}
        <div>
          <h4 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Por Empleado</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data.byEmployee || []).slice(0, 10).map((emp, idx) => {
              const porcentaje = ((emp.closed / data.total) * 100).toFixed(1);
              return (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{emp.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {emp.closed} ({porcentaje}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla por Área con detalles */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-slate-900 dark:text-white">Detalle por Área</h4>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-300 dark:border-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Área</th>
              <th className="text-right px-3 py-2">Reclamos</th>
              <th className="text-right px-3 py-2">Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {(data.byArea || []).map((area) => {
              const porcentaje = ((area.closed / data.total) * 100).toFixed(1);
              return (
                <tr key={area.id} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 text-slate-900 dark:text-white">{area.name}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                    {area.closed}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
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
