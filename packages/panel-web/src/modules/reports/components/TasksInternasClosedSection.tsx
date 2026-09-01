import { useTasksClosedByEmployee, type TaskClosedStats } from '../hooks/useTasksClosedByEmployee';
import type { DateRange } from '@/shared/components/ui/DateRangeFilter';
import { Card } from '@/shared/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TasksInternasClosedSection({ filters }: { filters: DateRange }) {
  const { data, isLoading } = useTasksClosedByEmployee(filters.dateFrom, filters.dateTo);
  if (isLoading) return <Card className="p-6"><p>Cargando...</p></Card>;
  const chartData = ((data as TaskClosedStats[]) || []).slice(0, 10).map((item) => ({
    name: item.empleado_nombre,
    tareas: item.tareas_completadas,
  }));
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold mb-4">Tareas Internas Completadas</h2>
      {chartData.length === 0 ? <p>Sin datos</p> : (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tareas" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left px-4 py-2">Empleado</th><th className="text-right px-4 py-2">Tareas</th></tr></thead>
            <tbody>
              {((data as TaskClosedStats[]) || []).map((item) => (
                <tr key={item.empleado_id} className="border-b">
                  <td className="px-4 py-2">{item.empleado_nombre}</td>
                  <td className="px-4 py-2 text-right font-semibold">{item.tareas_completadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
