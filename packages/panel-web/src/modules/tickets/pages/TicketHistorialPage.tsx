import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/services/api';
import type { TicketBeta } from '@/types/atlas';

interface TicketEliminado {
  id: string;
  ticket_numero: string;
  ticket_cliente: string;
  ticket_tipo: string;
  eliminado_por_nombre: string;
  razon: string;
  eliminado_en: string;
}

export function TicketHistorialPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tickets-eliminados'],
    queryFn: async () => {
      const res = await api.get('/v1/tickets-beta/eliminados/historial');
      return res.data;
    },
  });

  if (isLoading) return <div className="p-4">Cargando historial...</div>;

  const eliminados: TicketEliminado[] = data?.data || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de Tickets Eliminados</h2>
      
      {eliminados.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No hay tickets eliminados</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Eliminado Por</th>
                <th className="px-4 py-2 text-left">Motivo</th>
                <th className="px-4 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {eliminados.map((elim) => (
                <tr key={elim.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2">{elim.ticket_cliente}</td>
                  <td className="px-4 py-2">{elim.ticket_tipo}</td>
                  <td className="px-4 py-2">{elim.eliminado_por_nombre}</td>
                  <td className="px-4 py-2 text-slate-500">{elim.razon || '—'}</td>
                  <td className="px-4 py-2">{new Date(elim.eliminado_en).toLocaleDateString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
