import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Trash2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import { etiquetasMotivoTicket } from '@/types/atlas';
import type { TicketBeta } from '@/types/atlas';
import { AdjuntosTicketCard } from '@/modules/tickets/components/AdjuntosTicketCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/services/api';
import { useState } from 'react';

const estadoBadge: Record<string, 'neutral' | 'info' | 'warning'> = {
  nuevo: 'neutral',
  asignada: 'info',
  en_proceso: 'warning',
};

const estadoLabel: Record<string, string> = {
  nuevo: 'Nuevo',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
};

interface TicketDetailModalProps {
  ticket: TicketBeta | null;
  nombreCuadrilla: (id: string | null | undefined) => string;
  onClose: () => void;
  onEditar: (ticket: TicketBeta) => void;
  onDelete?: (ticketId: string) => void;
}

/** Vista de solo lectura de un ticket, con acceso rápido a editarlo o pasarlo a OT. */
export function TicketDetailModal({ ticket, nombreCuadrilla, onClose, onEditar, onDelete }: TicketDetailModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteMotivo, setDeleteMotivo] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

   const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/v1/tickets-beta/${id}`, { data: { motivo: deleteMotivo } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      if (onDelete && ticket?.id) onDelete(ticket.id);
      onClose();
    },
    onError: (err: any) => {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar el ticket');
    },
  });

  const handleDelete = () => {
    if (!ticket) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!ticket || !deleteMotivo.trim()) {
      alert('Debes indicar un motivo');
      return;
    }
    deleteMutation.mutate(ticket.id);
    setShowDeleteConfirm(false);
  };

 return (
    <>
      <Modal open={ticket !== null} onClose={onClose} title="Detalle del ticket" size="lg">
      {ticket && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {ticket.cliente || 'Sin nombre'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {tipoOrdenLabels[ticket.tipo as keyof typeof tipoOrdenLabels] ?? ticket.tipo}
                {ticket.motivo
                  ? ` · ${etiquetasMotivoTicket[ticket.motivo as keyof typeof etiquetasMotivoTicket] ?? ticket.motivo}`
                  : ''}
              </p>
            </div>
            <Badge variant={estadoBadge[ticket.estado] ?? 'neutral'}>
              {estadoLabel[ticket.estado] ?? ticket.estado}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Dato etiqueta="Teléfono" valor={ticket.cliente_telefono} icono={<Phone className="w-3 h-3" />} />
            <Dato etiqueta="Dirección" valor={ticket.direccion} icono={<MapPin className="w-3 h-3" />} />
            <Dato etiqueta="Cuadrilla" valor={nombreCuadrilla(ticket.cuadrilla_id)} />
            <Dato etiqueta="Zona" valor={ticket.zona} />
            <Dato etiqueta="Caja" valor={ticket.caja} />
            <Dato etiqueta="Precinto" valor={ticket.precinto} />
            <Dato etiqueta="SN" valor={ticket.sn} />
            <Dato etiqueta="Fecha" valor={new Date(ticket.creado_en).toLocaleDateString('es-AR')} />
          </div>

          {ticket.descripcion && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Qué reportó</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {ticket.descripcion}
              </p>
            </div>
          )}

          <AdjuntosTicketCard ticketId={ticket.id} />

          <div className="flex justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
           <Button
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onEditar(ticket)}>
                Editar
              </Button>
              <Button
                icon={<ArrowRight className="w-4 h-4" />}
              onClick={async () => {
                // Actualizar ticket a convertido_a_ot
                if (ticket?.id) {
                  await api.patch(`/v1/tickets-beta/${ticket.id}`, { estado: 'convertido_a_ot' });
                  queryClient.invalidateQueries({ queryKey: ['tickets'] });
                }
                navigate('/orders/nueva', {
                  state: {
                    desdeTicket: {
                      tipo: ticket.tipo,
                      descripcion: ticket.descripcion ?? '',
                      clienteNombre: ticket.cliente,
                      cuadrillaId: ticket.cuadrilla_id ?? undefined,
                      clienteId: ticket.cliente_id ?? undefined,
                      domicilioId: ticket.domicilio_id ?? undefined,
                      clienteTelefono: ticket.cliente_telefono ?? undefined,
                      direccion: ticket.direccion ?? undefined,
                      falla: ticket.motivo ?? undefined,
                      ticketBetaId: ticket.id,
                    },
                  },
                })
              }}
            >
              Convertir en OT
            </Button>
	    </div>
          </div>
        </div>
      )}
    </Modal>

    {showDeleteConfirm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-red-400 mb-4">Eliminar Ticket</h3>
          <p className="text-sm text-slate-300 mb-4">¿Estás seguro? Proporciona un motivo:</p>
          <textarea
            value={deleteMotivo}
            onChange={(e) => setDeleteMotivo(e.target.value)}
            placeholder="Motivo de eliminación..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-400 text-sm mb-4"
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteMotivo('');
              }}
              className="px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={!deleteMotivo.trim() || deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function Dato({
  etiqueta,
  valor,
  icono,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  icono?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
        {icono}
        {etiqueta}
      </p>
      <p className="text-sm text-slate-900 dark:text-white mt-0.5 truncate">{valor || '—'}</p>
    </div>
  );
}
