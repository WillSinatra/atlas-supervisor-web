import { useSupportTicketsResolution, type TicketResolutionStats } from '../hooks/useSupportTicketsResolution';
import type { DateRange } from '@/shared/components/ui/DateRangeFilter';
import { Card } from '@/shared/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SupportTicketsResolutionSection({ filters }: { filters: DateRange }) {
  const { data, isLoading } = useSupportTicketsResolution(filters.dateFrom, filters.dateTo);
  if (isLoading) return <Card className="p-6"><p>Cargando...</p></Card>;
  const chartData = ((data as TicketResolutionStats[]) || []).slice(0, 10).map((item) => ({
    name: item.resuelto_por_nombre,
    tickets: item.tickets_resueltos,
  }));
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold mb-4">Tickets de Soporte Resueltos</h2>
      {chartData.length === 0 ? <p>Sin datos</p> : (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tickets" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left px-4 py-2">Resuelto por</th><th className="text-right px-4 py-2">Tickets</th></tr></thead>
            <tbody>
              {((data as TicketResolutionStats[]) || []).map((item) => (
                <tr key={item.resuelto_por_id} className="border-b">
                  <td className="px-4 py-2">{item.resuelto_por_nombre}</td>
                  <td className="px-4 py-2 text-right font-semibold">{item.tickets_resueltos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
