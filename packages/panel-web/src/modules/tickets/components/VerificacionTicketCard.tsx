import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { mensajeDeError } from '@/shared/services/api';
import { verificacionApi } from '@/shared/services/checklist';
import type { ItemChecklistTicket } from '@/types/atlas';

interface VerificacionTicketCardProps {
  ticketId: string;
  /** Se avisa hacia arriba para poder habilitar o no el pase a OT. */
  onEstado?: (completo: boolean) => void;
}

/**
 * Lo que N2 tiene que descartar antes de mandar un técnico.
 *
 * Es un relevamiento distinto al de la orden: acá se resuelve lo que se puede
 * resolver por teléfono. Si algo obligatorio queda sin responder, el ticket no
 * se puede convertir en OT — la API también lo rechaza, esto no es solo visual.
 */
export function VerificacionTicketCard({ ticketId, onEstado }: VerificacionTicketCardProps) {
  const queryClient = useQueryClient();
  const [borradores, setBorradores] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ticket-verificacion', ticketId],
    queryFn: async () => {
      const r = await verificacionApi.deTicket(ticketId);
      onEstado?.(r.completo);
      return r;
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: { hecho?: boolean; respuesta?: string | null } }) =>
      verificacionApi.actualizarItem(id, cambios),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-verificacion', ticketId] });
      // El listado muestra el estado de verificación de cada ticket.
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
    },
  });

  const items = data?.data ?? [];

  // Sin ítems no es un error: es un tipo de ticket que no tiene verificación
  // definida. Se dice, en vez de mostrar una card vacía.
  if (!isLoading && !isError && items.length === 0) {
    return (
      <div className="card p-5">
        <Encabezado hechos={0} total={0} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este tipo de reclamo no tiene verificación definida, así que el ticket se puede convertir en orden
          de trabajo directamente. Las verificaciones se arman en Configuración → Checklists.
        </p>
      </div>
    );
  }

  const hechos = items.filter((i) => resuelto(i)).length;

  return (
    <div className="card p-5">
      <Encabezado hechos={hechos} total={items.length} />

      {isError && (
        <Alert variant="error" title="No se pudo cargar la verificación">
          {mensajeDeError(error)}
        </Alert>
      )}
      {actualizar.isError && (
        <div className="mb-3">
          <Alert variant="error">{mensajeDeError(actualizar.error)}</Alert>
        </div>
      )}

      {data && !data.completo && data.faltantes.length > 0 && (
        <div className="mb-3">
          <Alert variant="warning" title="Falta verificar para poder pasar a OT">
            {data.faltantes.map((f) => f.texto).join(' · ')}
          </Alert>
        </div>
      )}
      {data?.completo && items.length > 0 && (
        <div className="mb-3">
          <Alert variant="success">
            Verificación completa. El ticket se puede convertir en orden de trabajo.
          </Alert>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Fila
              key={item.id}
              item={item}
              borrador={borradores[item.id]}
              guardando={actualizar.isPending}
              onBorrador={(v) => setBorradores((b) => ({ ...b, [item.id]: v }))}
              onTilde={(hecho) => actualizar.mutate({ id: item.id, cambios: { hecho } })}
              onRespuesta={(respuesta) => {
                if (respuesta === (item.respuesta ?? '')) return;
                actualizar.mutate({ id: item.id, cambios: { respuesta } });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Encabezado({ hechos, total }: { hechos: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-atlas-600" /> Verificación previa
        {total > 0 && (
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            {hechos}/{total}
          </span>
        )}
      </h3>
    </div>
  );
}

/** Un ítem está resuelto cuando tiene respuesta, sea cual sea. Un "no" también responde. */
function resuelto(i: ItemChecklistTicket): boolean {
  return i.tipo === 'tilde' ? i.hecho : (i.respuesta ?? '') !== '';
}

interface FilaProps {
  item: ItemChecklistTicket;
  borrador: string | undefined;
  guardando: boolean;
  onBorrador: (valor: string) => void;
  onTilde: (hecho: boolean) => void;
  onRespuesta: (respuesta: string) => void;
}

function Fila({ item, borrador, guardando, onBorrador, onTilde, onRespuesta }: FilaProps) {
  const listo = resuelto(item);
  const valor = borrador ?? item.respuesta ?? '';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      {item.tipo === 'tilde' ? (
        <input
          type="checkbox"
          className="mt-0.5 rounded border-slate-300 dark:border-slate-600"
          checked={item.hecho}
          disabled={guardando}
          onChange={(e) => onTilde(e.target.checked)}
        />
      ) : (
        <span
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${listo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500'}`}
        />
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${listo ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-medium'}`}
        >
          {item.texto}
          {item.obligatorio && !listo && (
            <Badge variant="warning" className="ml-2">
              Obligatorio
            </Badge>
          )}
        </p>

        {item.tipo !== 'tilde' && (
          <input
            className="input py-1 text-sm mt-1.5"
            type={item.tipo === 'numero' ? 'number' : 'text'}
            placeholder="Sin responder"
            value={valor}
            onChange={(e) => onBorrador(e.target.value)}
            onBlur={(e) => onRespuesta(e.target.value.trim())}
          />
        )}
      </div>
    </div>
  );
}
