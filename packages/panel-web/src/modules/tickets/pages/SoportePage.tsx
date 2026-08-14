import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Lock,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Alert } from '@/shared/components/ui/Alert';
import { Modal } from '@/shared/components/ui/Modal';
import { mensajeDeError, ticketsBetaApi } from '@/shared/services/api';
import { TIPOS_ORDEN, tipoOrdenLabels, prioridadBadgeVariant, prioridadLabels } from '@/shared/constants/ordenLabels';
import { etiquetasMotivoTicket } from '@/types/atlas';
import type { TicketBeta } from '@/types/atlas';
import { VerificacionTicketCard } from '@/modules/tickets/components/VerificacionTicketCard';
import { CreateTicketModal } from '@/modules/orders/components/CreateTicketModal';
import { AdjuntosTicketCard } from '@/modules/tickets/components/AdjuntosTicketCard';

/**
 * Bandeja de soporte: la versión nueva del módulo de tickets.
 *
 * Convive con la pantalla vieja (`/tickets`) a propósito, para poder probarla
 * sin tocar lo que ya se usa. Cuando reemplace a la otra, se borra aquella y
 * esta pasa a `/tickets`.
 *
 * La diferencia de fondo no es visual: acá el ticket es algo que **se trabaja**
 * —N2 verifica antes de despachar— y no solo una fila que se convierte en OT.
 * Por eso es maestro-detalle en vez de una tabla con un modal gigante: se elige
 * un ticket a la izquierda y se trabaja a la derecha, sin perder de vista la
 * cola.
 */
export default function SoportePage() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  /** null = cerrado · 'nuevo' = alta · un ticket = edición. */
  const [editando, setEditando] = useState<TicketBeta | 'nuevo' | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets-beta', { tipo }],
    queryFn: () => ticketsBetaApi.listar(tipo ? { tipo } : undefined),
  });

  const tickets = useMemo(() => {
    const todos = data?.data ?? [];
    const q = busqueda.trim().toLowerCase();
    if (q === '') return todos;
    return todos.filter((t) =>
      [t.cliente, t.direccion, t.cliente_telefono, t.zona]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, busqueda]);

  const ticket = tickets.find((t) => t.id === seleccionado) ?? tickets[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Soporte</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Los reclamos que entran por el portal, el bot o carga manual. N2 verifica lo que se puede resolver
            sin ir al domicilio, y recién después se convierten en orden de trabajo.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setEditando('nuevo')}>
          Nuevo ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* ───────────────────────────── cola ───────────────────────────── */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <Input
              placeholder="Buscar por cliente, dirección o teléfono"
              leftIcon={<Search className="w-4 h-4" />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Select
              placeholder="Todos los tipos"
              options={TIPOS_ORDEN.map((t) => ({ value: t, label: tipoOrdenLabels[t] }))}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="card p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
            </div>
          ) : isError ? (
            <div className="card">
              <EmptyState
                icon={<WifiOff className="w-8 h-8" />}
                title="No se pudieron cargar los tickets"
                description={mensajeDeError(error)}
                action={
                  <Button variant="secondary" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                }
              />
            </div>
          ) : tickets.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="No hay tickets"
                description={busqueda ? 'Probá con otra búsqueda.' : 'Cuando entre un reclamo va a aparecer acá.'}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <FilaTicket
                  key={t.id}
                  ticket={t}
                  activo={ticket?.id === t.id}
                  onClick={() => setSeleccionado(t.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ──────────────────────────── detalle ─────────────────────────── */}
        {ticket ? (
          <Detalle
            ticket={ticket}
            onEditar={() => setEditando(ticket)}
            onConvertir={() => convertir(ticket, navigate)}
          />
        ) : (
          <div className="card">
            <EmptyState
              icon={<Inbox className="w-8 h-8" />}
              title="Elegí un ticket"
              description="Seleccioná uno de la lista para verlo y verificarlo."
            />
          </div>
        )}
      </div>

      {/* El mismo formulario que usa la pantalla anterior: duplicarlo sería
          tener dos altas de ticket que hay que acordarse de mantener iguales. */}
      <CreateTicketModal
        open={editando !== null}
        ticket={editando === 'nuevo' ? null : editando}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

function FilaTicket({
  ticket,
  activo,
  onClick,
}: {
  ticket: TicketBeta;
  activo: boolean;
  onClick: () => void;
}) {
  const pendientes = ticket.verificacion_pendiente ?? 0;
  const fotos = ticket.fotos_total ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left card p-3 transition-colors ${
        activo
          ? 'ring-2 ring-atlas-500 bg-atlas-50/50 dark:bg-atlas-900/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {ticket.cliente || 'Sin nombre'}
        </p>
        <Badge variant={prioridadBadgeVariant[ticket.prioridad]}>{prioridadLabels[ticket.prioridad]}</Badge>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
        {tipoOrdenLabels[ticket.tipo as keyof typeof tipoOrdenLabels] ?? ticket.tipo}
        {ticket.motivo ? ` · ${etiquetasMotivoTicket[ticket.motivo as keyof typeof etiquetasMotivoTicket] ?? ticket.motivo}` : ''}
      </p>

      {ticket.direccion && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" /> {ticket.direccion}
        </p>
      )}

      {(pendientes > 0 || fotos > 0) && (
        <div className="flex items-center gap-3 mt-1.5">
          {pendientes > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              {pendientes} sin verificar
            </span>
          )}
          {/* Que el reclamo trae una foto es medio diagnóstico: se ve desde
              acá para no tener que abrir ticket por ticket buscándola. */}
          {fotos > 0 && (
            <span
              className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"
              title={fotos === 1 ? '1 imagen adjunta' : `${fotos} imágenes adjuntas`}
            >
              <Paperclip className="w-3 h-3 shrink-0" />
              {fotos}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function Detalle({
  ticket,
  onEditar,
  onConvertir,
}: {
  ticket: TicketBeta;
  onEditar: () => void;
  onConvertir: () => void;
}) {
  const queryClient = useQueryClient();
  // El listado ya trae el estado; la card lo refresca al responder un ítem.
  const [completo, setCompleto] = useState(ticket.verificacion_completa ?? true);
  const [resolviendo, setResolviendo] = useState(false);
  const [resolucion, setResolucion] = useState('');
  const traba = !completo;
  const resuelto = ticket.estado === 'resuelto';

  const cerrar = useMutation({
    mutationFn: () => ticketsBetaApi.resolver(ticket.id, resolucion.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
      setResolviendo(false);
      setResolucion('');
    },
  });

  const reabrir = useMutation({
    mutationFn: () => ticketsBetaApi.reabrir(ticket.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets-beta'] }),
  });

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {ticket.cliente || 'Sin nombre'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {tipoOrdenLabels[ticket.tipo as keyof typeof tipoOrdenLabels] ?? ticket.tipo}
              {ticket.motivo
                ? ` · ${etiquetasMotivoTicket[ticket.motivo as keyof typeof etiquetasMotivoTicket] ?? ticket.motivo}`
                : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {resuelto ? (
              <Button
                variant="secondary"
                icon={<RotateCcw className="w-4 h-4" />}
                loading={reabrir.isPending}
                onClick={() => reabrir.mutate()}
              >
                Reabrir
              </Button>
            ) : (
              <>
                <Button variant="secondary" icon={<Pencil className="w-4 h-4" />} onClick={onEditar}>
                  Editar
                </Button>
                {/* El desenlace más común de un buen N2: se arregló por teléfono
                    y no hace falta mandar a nadie. */}
                <Button
                  variant="secondary"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => setResolviendo(true)}
                  title="Cerrar el reclamo sin generar orden de trabajo"
                >
                  Resolver sin OT
                </Button>
                <Button
                  icon={traba ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  disabled={traba}
                  onClick={onConvertir}
                  title={
                    traba
                      ? 'Faltan ítems de la verificación previa'
                      : 'Crear la orden de trabajo con estos datos'
                  }
                >
                  Convertir en OT
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Dato etiqueta="Teléfono" valor={ticket.cliente_telefono} icono={<Phone className="w-3 h-3" />} />
          <Dato etiqueta="Dirección" valor={ticket.direccion} icono={<MapPin className="w-3 h-3" />} />
          <Dato etiqueta="Zona" valor={ticket.zona} />
          <Dato etiqueta="Caja" valor={ticket.caja} />
          <Dato etiqueta="Precinto" valor={ticket.precinto} />
          <Dato etiqueta="SN" valor={ticket.sn} />
        </div>

        {ticket.descripcion && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Qué reportó</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {ticket.descripcion}
            </p>
          </div>
        )}
      </div>

      <AdjuntosTicketCard ticketId={ticket.id} />

      <VerificacionTicketCard ticketId={ticket.id} onEstado={setCompleto} />

      <Modal
        open={resolviendo}
        onClose={() => setResolviendo(false)}
        title="Resolver sin orden de trabajo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            El ticket se cierra y no se genera ninguna OT. Contá cómo se resolvió: es lo que después permite
            ver qué se arregla sin visita y detectar reincidencias.
          </p>

          {cerrar.isError && <Alert variant="error">{mensajeDeError(cerrar.error)}</Alert>}

          <textarea
            className="input min-h-24"
            placeholder="Ej: el cliente reinició la ONT y el servicio volvió. Se verificó señal en el OLT."
            value={resolucion}
            onChange={(e) => setResolucion(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResolviendo(false)}>
              Cancelar
            </Button>
            <Button
              loading={cerrar.isPending}
              disabled={resolucion.trim() === ''}
              onClick={() => cerrar.mutate()}
            >
              Cerrar el ticket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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

/**
 * Lleva a Nueva Orden con los datos del ticket precargados, igual que la
 * pantalla vieja, más el `ticketBetaId`: con eso la API vuelve a chequear la
 * verificación y rechaza la creación si quedó algo pendiente. El botón
 * deshabilitado es comodidad; el control de verdad está del otro lado.
 */
function convertir(ticket: TicketBeta, navigate: ReturnType<typeof useNavigate>) {
  navigate('/orders/nueva', {
    state: {
      desdeTicket: {
        tipo: ticket.tipo,
        descripcion: ticket.descripcion ?? '',
        clienteNombre: ticket.cliente,
        cuadrillaId: ticket.cuadrilla_id ?? undefined,
        clienteId: ticket.cliente_id ?? undefined,
        domicilioId: ticket.domicilio_id ?? undefined,
        // Con esto, si el ticket no está ligado al padrón, Nueva Orden busca
        // sola al cliente y ofrece darlo de alta sin volver a tipear nada.
        clienteTelefono: ticket.cliente_telefono ?? undefined,
        direccion: ticket.direccion ?? undefined,
        // El motivo del reclamo es la `falla` de la orden: mismo vocabulario.
        falla: ticket.motivo ?? undefined,
        ticketBetaId: ticket.id,
      },
    },
  });
}
