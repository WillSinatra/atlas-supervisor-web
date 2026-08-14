import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Camera, PenTool, Pencil, UserCog, WifiOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Alert } from '@/shared/components/ui/Alert';
import { Modal } from '@/shared/components/ui/Modal';
import { ordenesApi, clientesApi, cuadrillasApi, archivosApi, vehiculosApi, mensajeDeError } from '@/shared/services/api';
import { haversineDistanceKm, type Coordenadas } from '@/shared/utils/geo';
import { formatOrdenSlaRemaining, getOrdenSlaState } from '@/shared/utils/sla';
import { TarjetaUbicacion } from '@/shared/components/TarjetaUbicacion';
import { BuscadorCliente } from '@/shared/components/BuscadorCliente';
import { ArchivoImagen, VisorImagen } from '@/shared/components/ArchivoImagen';
import {
  estadoOrdenLabels,
  estadoOrdenBadgeVariant,
  prioridadLabels,
  prioridadBadgeVariant,
  tipoOrdenLabels,
  fallaLabels,
  estadoCuadrillaLabels,
} from '@/shared/constants/ordenLabels';
import type { TipoOrden, Falla } from '@/shared/constants/ordenLabels';
import { OrdenCamposComunes, type CamposComunesValues } from '@/modules/orders/components/OrdenCamposComunes';
import type { Archivo, Cliente, EditarOrdenInput, Orden } from '@/types/atlas';
import { MaterialesOrdenCard } from '@/modules/orders/components/MaterialesOrdenCard';
import { ChecklistOrdenCard } from '@/modules/orders/components/ChecklistOrdenCard';

const eventoLabels: Record<string, string> = {
  creada: 'Orden creada',
  actualizada: 'Datos actualizados',
  asignada: 'Cuadrilla asignada',
};

const ESTADOS_BLOQUEADOS = ['completada', 'cancelada'];

const etiquetasOferta: Record<string, string> = {
  pendiente: 'Esperando',
  aceptada: 'Aceptó',
  rechazada: 'Rechazó',
  expirada: 'Sin respuesta',
};

const variantOferta: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pendiente: 'warning',
  aceptada: 'success',
  rechazada: 'danger',
  expirada: 'neutral',
};

/** Todo lo editable de la orden: los campos comunes más sobre qué se hace. */
interface EdicionValues extends CamposComunesValues {
  tipo: TipoOrden | '';
  cliente_id: string;
  domicilio_id: string;
}

function isoAInputLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function valoresDesdeOrden(orden: Orden): EdicionValues {
  return {
    titulo: orden.titulo ?? '',
    descripcion: orden.descripcion ?? '',
    prioridad: orden.prioridad,
    falla: (orden.falla as Falla) ?? '',
    sla_id: orden.sla_id ?? '',
    fecha_programada: isoAInputLocal(orden.fecha_programada),
    tipo: (orden.tipo as TipoOrden) ?? '',
    cliente_id: orden.cliente_id,
    domicilio_id: orden.domicilio_id,
  };
}

function calcularDiff(original: EdicionValues, actual: EdicionValues): EditarOrdenInput {
  const diff: EditarOrdenInput = {};
  if (actual.titulo !== original.titulo) diff.titulo = actual.titulo;
  if (actual.descripcion !== original.descripcion) diff.descripcion = actual.descripcion;
  if (actual.prioridad !== original.prioridad) diff.prioridad = actual.prioridad || undefined;
  if (actual.falla !== original.falla) diff.falla = actual.falla || undefined;
  if (actual.sla_id !== original.sla_id) diff.sla_id = actual.sla_id || undefined;
  if (actual.tipo !== original.tipo) diff.tipo = actual.tipo || undefined;
  if (actual.fecha_programada !== original.fecha_programada) {
    diff.fecha_programada = actual.fecha_programada ? new Date(actual.fecha_programada).toISOString() : undefined;
  }
  // Cliente y domicilio viajan juntos: la API valida que el domicilio sea de
  // ese cliente, y mandar uno solo es la forma de que dé 400.
  if (actual.cliente_id !== original.cliente_id || actual.domicilio_id !== original.domicilio_id) {
    diff.cliente_id = actual.cliente_id;
    diff.domicilio_id = actual.domicilio_id;
  }
  return diff;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, error } = useQuery<Orden>({
    queryKey: ['orden', id],
    queryFn: () => ordenesApi.detalle(id!),
    enabled: !!id,
    // Mientras no haya cuadrilla asignada, se sigue de cerca: si la cascada
    // la asigna sola (una cuadrilla acepta la oferta), acá es donde se entera
    // de que `cuadrilla_id` cambió. Sin este refetch, la oferta pasa a
    // "aceptada" pero la tarjeta de Asignación y el botón de la cuadrilla
    // candidata quedan mostrando el estado viejo hasta que alguien recargue.
    refetchInterval: (query) => (query.state.data && !query.state.data.cuadrilla_id ? 10_000 : false),
  });
  const { data: cliente } = useQuery({
    queryKey: ['cliente', order?.cliente_id],
    queryFn: () => clientesApi.detalle(order!.cliente_id),
    enabled: !!order?.cliente_id,
  });
  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas'],
    queryFn: () => cuadrillasApi.listar(),
  });
  // El detalle de la cuadrilla trae sus técnicos: de ahí sale el responsable.
  const { data: cuadrillaAsignada } = useQuery({
    queryKey: ['cuadrilla', order?.cuadrilla_id],
    queryFn: () => cuadrillasApi.detalle(order!.cuadrilla_id!),
    enabled: !!order?.cuadrilla_id,
  });
  // Posiciones reales de la flota. Se refresca solo: una distancia de hace
  // media hora no sirve para decidir a quién mandar.
  const { data: flota } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => vehiculosApi.listar(),
    refetchInterval: 60_000,
    staleTime: 0,
  });
  const { data: fotos } = useQuery<Archivo[]>({
    queryKey: ['fotos', id],
    queryFn: () => archivosApi.listarFotos(id!),
    enabled: !!id,
  });

  const invalidarOrden = () => {
    queryClient.invalidateQueries({ queryKey: ['orden', id] });
    queryClient.invalidateQueries({ queryKey: ['ordenes'] });
  };

  const assignMutation = useMutation({
    mutationFn: (cuadrillaId: string) => ordenesApi.asignar(id!, cuadrillaId),
    onSuccess: invalidarOrden,
  });

  const cascadaMutation = useMutation({
    mutationFn: () => ordenesApi.dispararCascada(id!),
    onSuccess: () => {
      invalidarOrden();
      queryClient.invalidateQueries({ queryKey: ['ofertas', id] });
    },
  });

  // Mientras la orden esté sin asignar, se sigue la cascada de cerca: las
  // ofertas vencen en segundos y las va tomando el cron.
  const { data: ofertas } = useQuery({
    queryKey: ['ofertas', id],
    queryFn: () => ordenesApi.ofertas(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((o) => o.estado === 'pendiente') ? 10_000 : false,
    staleTime: 0,
  });

  const ubicacionMutation = useMutation({
    mutationFn: ({ domicilioId, coordenadas }: { domicilioId: string; coordenadas: Coordenadas | null }) =>
      clientesApi.actualizarDomicilio(domicilioId, {
        lat: coordenadas?.lat ?? null,
        lng: coordenadas?.lng ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', order?.cliente_id] });
      invalidarOrden();
    },
  });

  /** La evidencia que se está mirando en grande, o null si el visor está cerrado. */
  const [visor, setVisor] = useState<{ id: string; titulo: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editOriginal, setEditOriginal] = useState<EdicionValues | null>(null);
  const [editForm, setEditForm] = useState<EdicionValues | null>(null);
  const [clienteEdicion, setClienteEdicion] = useState<Cliente | null>(null);

  const editMutation = useMutation({
    mutationFn: (patch: EditarOrdenInput) => ordenesApi.actualizar(id!, patch),
    onSuccess: () => {
      invalidarOrden();
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
      setEditOpen(false);
    },
  });

  // Los domicilios del cliente elegido en el modal (puede no ser el actual).
  const { data: domiciliosEdicion } = useQuery({
    queryKey: ['domicilios', editForm?.cliente_id],
    queryFn: () => clientesApi.domicilios(editForm!.cliente_id),
    enabled: editOpen && !!editForm?.cliente_id,
  });

  const edicionBloqueada = order ? ESTADOS_BLOQUEADOS.includes(order.estado) : false;

  const openEdit = () => {
    if (!order || edicionBloqueada) return;
    const valores = valoresDesdeOrden(order);
    setEditOriginal(valores);
    setEditForm(valores);
    setClienteEdicion(cliente ?? null);
    editMutation.reset();
    setEditOpen(true);
  };

  const diff = editOriginal && editForm ? calcularDiff(editOriginal, editForm) : {};
  const hayCambios = Object.keys(diff).length > 0;

  const domicilio = useMemo(
    () => cliente?.domicilios?.find((d) => d.id === order?.domicilio_id),
    [cliente, order],
  );

  /** Dónde está cada cuadrilla según el GPS, por id de cuadrilla. */
  const posicionesGps = useMemo(() => {
    const mapa = new Map<string, { lat: number; lng: number; minutos: number | null }>();
    for (const v of flota?.vehiculos ?? []) {
      if (v.cuadrilla) {
        mapa.set(v.cuadrilla.id, { lat: v.lat, lng: v.lng, minutos: v.minutos_desde_reporte });
      }
    }
    return mapa;
  }, [flota]);

  // La distancia se calcula contra la posición del GPS, no contra
  // `cuadrillas.lat/lng`: esa columna se carga a mano y queda vieja apenas la
  // cuadrilla se mueve. Si una cuadrilla no aparece en el GPS se usa su última
  // ubicación guardada, y la fila lo aclara para no decidir sobre un dato viejo
  // creyendo que es de ahora.
  const candidateCuadrillas = useMemo(() => {
    if (!cuadrillasData) return [];
    const destino =
      domicilio?.lat != null && domicilio?.lng != null ? { lat: domicilio.lat, lng: domicilio.lng } : null;

    return [...cuadrillasData.data]
      .map((cuadrilla) => {
        const gps = posicionesGps.get(cuadrilla.id) ?? null;
        const origen = gps ?? cuadrilla.ubicacion;
        return {
          cuadrilla,
          distanceKm:
            destino && origen ? haversineDistanceKm(destino.lat, destino.lng, origen.lat, origen.lng) : null,
          desdeGps: gps !== null,
          minutos: gps?.minutos ?? null,
        };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [cuadrillasData, domicilio, posicionesGps]);

  const hasEvidence = !!order?.firma_cliente || !!order?.foto_despues || (fotos && fotos.length > 0);
  const slaState = order ? getOrdenSlaState(order) : null;

  useEffect(() => {
    if (editForm === null && order && editOpen) {
      setEditForm(valoresDesdeOrden(order));
    }
  }, [order, editOpen, editForm]);

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center h-96">
        {isError ? (
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar la orden"
            description={mensajeDeError(error)}
          />
        ) : (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{order.numero}</h1>
          {order.titulo && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{order.titulo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos generales</h3>
              <Button
                variant="ghost" size="sm"
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={openEdit}
                disabled={edicionBloqueada}
                title={edicionBloqueada ? 'La orden no se puede editar en este estado' : undefined}
              >
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Tipo" value={tipoOrdenLabels[order.tipo as TipoOrden] ?? order.tipo} />
              <Field label="Estado" value={<Badge variant={estadoOrdenBadgeVariant[order.estado]}>{estadoOrdenLabels[order.estado]}</Badge>} />
              <Field label="Prioridad" value={<Badge variant={prioridadBadgeVariant[order.prioridad]}>{prioridadLabels[order.prioridad]}</Badge>} />
              <Field label="Cliente" value={cliente?.nombre ?? '…'} />
              <Field label="Domicilio" value={domicilio?.direccion ?? '—'} />
              <Field
                label="SLA restante"
                value={
                  <span className={slaState === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : slaState === 'dueSoon' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                    {formatOrdenSlaRemaining(order)}
                  </span>
                }
              />
            </div>
            {order.falla && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Falla</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{fallaLabels[order.falla as Falla] ?? order.falla}</p>
              </div>
            )}
            {order.descripcion && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{order.descripcion}</p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Línea de tiempo</h3>
            {order.linea_tiempo.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay eventos registrados.</p>
            ) : (
              <ol className="space-y-4">
                {order.linea_tiempo.map((entry, idx) => (
                  <li key={entry.id} className="relative pl-6">
                    {idx < order.linea_tiempo.length - 1 && (
                      <span className="absolute left-[5px] top-4 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-atlas-600" />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {eventoLabels[entry.tipo_evento] ?? entry.tipo_evento}
                    </p>
                    {entry.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.descripcion}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.creado_en).toLocaleString('es-AR')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ChecklistOrdenCard ordenId={order.id} />

          <MaterialesOrdenCard ordenId={order.id} cuadrillaId={order.cuadrilla_id} />

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Evidencia</h3>
            {!hasEvidence ? (
              <EmptyState
                icon={<Camera className="w-8 h-8" />}
                title="Sin evidencia cargada"
                description="El técnico todavía no subió fotos ni firma desde la app móvil."
              />
            ) : (
              <div className="space-y-5">
                {fotos && fotos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Fotos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {fotos.map((foto) => (
                        <div key={foto.id} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          <ArchivoImagen
                            archivoId={foto.id}
                            alt={foto.tipo}
                            className="w-full h-24 object-cover"
                            onClick={() => setVisor({ id: foto.id, titulo: etiquetaFoto(foto.tipo) })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {order.firma_cliente && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5" /> Firma del cliente
                    </p>
                    {/*
                      Alto y ancho mínimos explícitos: la firma es un SVG y, si
                      no trae dimensiones intrínsecas, el navegador la colapsa a
                      una tira de pocos píxeles. `object-contain` la encuadra sin
                      deformarla, sea cual sea la proporción con que se dibujó.
                    */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 inline-block bg-white">
                      <ArchivoImagen
                        archivoId={order.firma_cliente}
                        alt="Firma del cliente"
                        className="h-24 w-48 object-contain"
                        onClick={() => setVisor({ id: order.firma_cliente!, titulo: 'Firma del cliente' })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Asignación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {order.cuadrilla_id
                ? `Asignada a ${cuadrillasData?.data.find((c) => c.id === order.cuadrilla_id)?.nombre ?? order.cuadrilla_id}${
                    cuadrillaAsignada?.vehiculo?.patente ? ` · Patente ${cuadrillaAsignada.vehiculo.patente}` : ''
                  }`
                : 'Sin cuadrilla asignada'}
            </p>

            {order.cuadrilla_id && (cuadrillaAsignada?.tecnicos ?? []).length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <UserCog className="w-3.5 h-3.5" /> Quiénes van
                </p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {(cuadrillaAsignada?.tecnicos ?? []).map((t) => t.nombre).join(' · ')}
                </p>
              </div>
            )}

            {assignMutation.isError && (
              <div className="mb-3">
                <Alert variant="error" title="No se pudo asignar la cuadrilla">
                  {mensajeDeError(assignMutation.error)}
                </Alert>
              </div>
            )}
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Cuadrillas candidatas por cercanía
            </p>
            <div className="space-y-2">
              {candidateCuadrillas.map(({ cuadrilla, distanceKm, desdeGps, minutos }) => (
                <CandidateCrewRow
                  key={cuadrilla.id}
                  cuadrilla={cuadrilla}
                  distanceKm={distanceKm}
                  desdeGps={desdeGps}
                  minutos={minutos}
                  isAssigned={cuadrilla.id === order.cuadrilla_id}
                  onAssign={() => assignMutation.mutate(cuadrilla.id)}
                  isLoading={assignMutation.isPending}
                />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Propuesta con cascada
              </p>
              <Button
                variant="secondary"
                className="w-full"
                loading={cascadaMutation.isPending}
                disabled={!!order.cuadrilla_id}
                onClick={() => cascadaMutation.mutate()}
              >
                Ofrecer a la más cercana
              </Button>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                Se la ofrece a la cuadrilla disponible más cercana. Si no responde a tiempo, pasa sola a la
                siguiente.
              </p>
              {cascadaMutation.data && (
                <div className="mt-3">
                  <Alert variant={cascadaMutation.data.ofrecida ? 'success' : 'warning'} title={cascadaMutation.data.ofrecida ? 'Ofrecida' : 'No se pudo ofrecer'}>
                    {cascadaMutation.data.motivo}
                  </Alert>
                </div>
              )}
              {cascadaMutation.isError && (
                <div className="mt-3">
                  <Alert variant="error" title="No se pudo ofrecer">
                    {mensajeDeError(cascadaMutation.error)}
                  </Alert>
                </div>
              )}

              {(ofertas ?? []).length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    A quién se le ofreció
                  </p>
                  {(ofertas ?? []).map((oferta) => (
                    <div key={oferta.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {oferta.secuencia + 1}. {oferta.cuadrilla.nombre ?? '—'}
                        {oferta.distancia_metros != null && (
                          <span className="text-slate-400"> · {(oferta.distancia_metros / 1000).toFixed(1)} km</span>
                        )}
                      </span>
                      <Badge variant={variantOferta[oferta.estado] ?? 'neutral'}>
                        {etiquetasOferta[oferta.estado] ?? oferta.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <TarjetaUbicacion
            direccion={domicilio?.direccion}
            lat={domicilio?.lat ?? null}
            lng={domicilio?.lng ?? null}
            guardando={ubicacionMutation.isPending}
            error={ubicacionMutation.isError ? mensajeDeError(ubicacionMutation.error) : null}
            vacioDescripcion="Este domicilio todavía no tiene coordenadas, así que no se puede ubicar ni calcular la cuadrilla más cercana."
            onGuardar={
              domicilio
                ? (coordenadas) =>
                    ubicacionMutation.mutateAsync({ domicilioId: domicilio.id, coordenadas })
                : undefined
            }
          />
        </div>
      </div>

      <VisorImagen
        archivoId={visor?.id ?? null}
        titulo={visor?.titulo ?? ''}
        onClose={() => setVisor(null)}
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden" size="lg">
        {editForm && (
          <div className="space-y-5">
            {editMutation.isError && (
              <Alert variant="error" title="No se pudo guardar">
                {mensajeDeError(editMutation.error)}
              </Alert>
            )}

            <section className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sobre qué es</h4>
              <Select
                label="Tipo"
                placeholder="Seleccionar tipo"
                value={editForm.tipo}
                options={Object.entries(tipoOrdenLabels).map(([value, label]) => ({ value, label }))}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, tipo: e.target.value as TipoOrden } : prev))}
              />
              <BuscadorCliente
                cliente={clienteEdicion}
                onSeleccionar={(c) => {
                  setClienteEdicion(c);
                  setEditForm((prev) => (prev ? { ...prev, cliente_id: c?.id ?? '', domicilio_id: '' } : prev));
                }}
              />
              <Select
                label="Domicilio *"
                placeholder={editForm.cliente_id ? 'Seleccionar domicilio' : 'Elegí un cliente primero'}
                value={editForm.domicilio_id}
                disabled={!editForm.cliente_id}
                options={(domiciliosEdicion ?? []).map((d) => ({ value: d.id, label: d.direccion }))}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, domicilio_id: e.target.value } : prev))
                }
              />
            </section>

            <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detalle del trabajo</h4>
              <OrdenCamposComunes
                mostrarFalla={true}
                values={editForm}
                onChange={(key, value) => setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev))}
              />
            </section>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => editMutation.mutate(diff)}
                disabled={!hayCambios || !editForm.domicilio_id || editMutation.isPending}
                loading={editMutation.isPending}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CandidateCrewRow({
  cuadrilla,
  distanceKm,
  desdeGps,
  minutos,
  isAssigned,
  onAssign,
  isLoading,
}: {
  cuadrilla: { id: string; nombre: string; estado: string };
  distanceKm: number | null;
  desdeGps: boolean;
  minutos: number | null;
  isAssigned: boolean;
  onAssign: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{cuadrilla.nombre}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {estadoCuadrillaLabels[cuadrilla.estado as keyof typeof estadoCuadrillaLabels] ?? cuadrilla.estado}
          {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
        </p>
        {distanceKm != null && (
          <p className={`text-xs ${desdeGps ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {desdeGps
              ? `GPS${minutos != null ? ` · hace ${minutos} min` : ''}`
              : 'Sin GPS: última ubicación guardada'}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant={isAssigned ? 'secondary' : 'primary'}
        onClick={onAssign}
        disabled={isAssigned || isLoading}
      >
        {isAssigned ? 'Asignada' : 'Asignar'}
      </Button>
    </div>
  );
}

const etiquetasFoto: Record<string, string> = {
  foto: 'Foto',
  foto_antes: 'Foto antes',
  foto_despues: 'Foto después',
  firma: 'Firma del cliente',
  // Vino adjunta al reclamo y se copió acá al convertirlo en OT. Distinguirla
  // importa: no la sacó el técnico en el domicilio, la mandó el cliente antes.
  ticket: 'Del reclamo',
};

function etiquetaFoto(tipo: string): string {
  return etiquetasFoto[tipo] ?? 'Foto';
}

/*
 * ArchivoImage, useArchivoUrl y el visor viven en
 * shared/components/ArchivoImagen: los usan también los adjuntos del ticket.
 */


function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
