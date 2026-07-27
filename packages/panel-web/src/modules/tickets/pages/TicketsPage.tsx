import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ticketsBetaApi, mensajeDeError } from '@/shared/services/api';
import { CreateTicketModal } from '@/modules/orders/components/CreateTicketModal';

type TicketStatus = 'nuevo' | 'asignada' | 'en_proceso';

const estadoBadge: Record<TicketStatus, 'neutral' | 'info' | 'warning'> = {
  nuevo: 'neutral',
  asignada: 'info',
  en_proceso: 'warning',
};

const estadoLabel: Record<TicketStatus, string> = {
  nuevo: 'Nuevo',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsBetaApi.listar(),
  });

  const tickets = (data?.data ?? []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (t.cliente ?? '').toLowerCase().includes(q) ||
      (t.direccion ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tickets</h1>
            <Badge variant="info">Beta</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione los tickets recibidos
          </p>
        </div>
        <Button
          variant="primary"
          icon={<FileText className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Crear Ticket
        </Button>
      </div>

      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="card p-4">
        <Input
          placeholder="Buscar por cliente o dirección..."
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No se pudo cargar los tickets"
            description={mensajeDeError(error)}
            action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
          />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No hay tickets registrados"
            description="Creá el primer ticket usando el botón de arriba."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {ticket.cliente ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {ticket.direccion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {ticket.tipo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {ticket.cuadrilla_id ?? 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={estadoBadge[ticket.estado as TicketStatus] ?? 'neutral'}>
                        {estadoLabel[ticket.estado as TicketStatus] ?? ticket.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(ticket.creado_en).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate("/orders/nueva", { state: { desdeTicket: { tipo: ticket.tipo, descripcion: ticket.descripcion ?? "", clienteNombre: ticket.cliente } } })}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        Convertir en OT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              {data.pagination.total} ticket{data.pagination.total === 1 ? '' : 's'} en total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
