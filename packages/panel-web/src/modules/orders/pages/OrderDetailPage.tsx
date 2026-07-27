import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Camera, PenTool, Navigation, Pencil, WifiOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Alert } from '@/shared/components/ui/Alert';
import { Modal } from '@/shared/components/ui/Modal';
import { ordenesApi, clientesApi, cuadrillasApi, archivosApi, mensajeDeError } from '@/shared/services/api';
import { haversineDistanceKm } from '@/shared/utils/geo';
import { formatOrdenSlaRemaining, getOrdenSlaState } from '@/shared/utils/sla';
import {
  estadoOrdenLabels,
  estadoOrdenBadgeVariant,
  prioridadLabels,
  prioridadBadgeVariant,
  tipoOrdenLabels,
  fallaLabels,
  estadoCuadrillaLabels,
  estadoCuadrillaBadgeVariant,
} from '@/shared/constants/ordenLabels';
import type { TipoOrden, Falla } from '@/shared/constants/ordenLabels';
import { OrdenCamposComunes, type CamposComunesValues } from '@/modules/orders/components/OrdenCamposComunes';
import type { Archivo, EditarOrdenInput, Orden } from '@/types/atlas';

const eventoLabels: Record<string, string> = {
  creada: 'Orden creada',
  actualizada: 'Datos actualizados',
  asignada: 'Cuadrilla asignada',
};

const ESTADOS_BLOQUEADOS = ['completada', 'cancelada'];

function isoAInputLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function valoresDesdeOrden(orden: Orden): CamposComunesValues {
  return {
    titulo: orden.titulo ?? '',
    descripcion: orden.descripcion ?? '',
    prioridad: orden.prioridad,
    falla: (orden.falla as Falla) ?? '',
    sla_id: orden.sla_id ?? '',
    fecha_programada: isoAInputLocal(orden.fecha_programada),
  };
}

function calcularDiff(original: CamposComunesValues, actual: CamposComunesValues): EditarOrdenInput {
  const diff: EditarOrdenInput = {};
  if (actual.titulo !== original.titulo) diff.titulo = actual.titulo;
  if (actual.descripcion !== original.descripcion) diff.descripcion = actual.descripcion;
  if (actual.prioridad !== original.prioridad) diff.prioridad = actual.prioridad || undefined;
  if (actual.falla !== original.falla) diff.falla = actual.falla || undefined;
  if (actual.sla_id !== original.sla_id) diff.sla_id = actual.sla_id || undefined;
  if (actual.fecha_programada !== original.fecha_programada) {
    diff.fecha_programada = actual.fecha_programada ? new Date(actual.fecha_programada).toISOString() : undefined;
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

  const [editOpen, setEditOpen] = useState(false);
  const [editOriginal, setEditOriginal] = useState<CamposComunesValues | null>(null);
  const [editForm, setEditForm] = useState<CamposComunesValues | null>(null);

  const editMutation = useMutation({
    mutationFn: (patch: EditarOrdenInput) => ordenesApi.actualizar(id!, patch),
    onSuccess: () => {
      invalidarOrden();
      setEditOpen(false);
    },
  });

  const edicionBloqueada = order ? ESTADOS_BLOQUEADOS.includes(order.estado) : false;

  const openEdit = () => {
    if (!order || edicionBloqueada) return;
    const valores = valoresDesdeOrden(order);
    setEditOriginal(valores);
    setEditForm(valores);
    editMutation.reset();
    setEditOpen(true);
  };

  const diff = editOriginal && editForm ? calcularDiff(editOriginal, editForm) : {};
  const hayCambios = Object.keys(diff).length > 0;

  const domicilio = useMemo(
    () => cliente?.domicilios?.find((d) => d.id === order?.domicilio_id),
    [cliente, order],
  );

  const candidateCuadrillas = useMemo(() => {
    if (!cuadrillasData) return [];
    return [...cuadrillasData.data]
      .map((cuadrilla) => ({
        cuadrilla,
        distanceKm:
          domicilio?.lat != null && domicilio?.lng != null && cuadrilla.ubicacion
            ? haversineDistanceKm(domicilio.lat, domicilio.lng, cuadrilla.ubicacion.lat, cuadrilla.ubicacion.lng)
            : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [cuadrillasData, domicilio]);

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
                          <ArchivoImage archivoId={foto.id} alt={foto.tipo} className="w-full h-24 object-cover" />
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
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 inline-block bg-white">
                      <ArchivoImage archivoId={order.firma_cliente} alt="Firma" className="h-16" />
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
                ? `Asignada a ${cuadrillasData?.data.find((c) => c.id === order.cuadrilla_id)?.nombre ?? order.cuadrilla_id}`
                : 'Sin cuadrilla asignada'}
            </p>
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
              {candidateCuadrillas.map(({ cuadrilla, distanceKm }) => (
                <CandidateCrewRow
                  key={cuadrilla.id}
                  cuadrilla={cuadrilla}
                  distanceKm={distanceKm}
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
              <Button variant="secondary" className="w-full" disabled>
                Próximamente
              </Button>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                Envía la OT a varias cuadrillas en simultáneo y asigna a la primera que acepte.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> Ubicación
            </h3>
            <div className="h-40 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-1">
              <Navigation className="w-6 h-6 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">Mapa próximamente</p>
            </div>
            {domicilio && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{domicilio.direccion}</p>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar orden"
        size="lg"
      >
        {editForm && (
          <div className="space-y-4">
            {editMutation.isError && (
              <Alert variant="error" title="No se pudo guardar">
                {mensajeDeError(editMutation.error)}
              </Alert>
            )}
            <OrdenCamposComunes mostrarFalla={true}
              values={editForm}
              onChange={(key, value) =>
                setEditForm((prev) => prev ? { ...prev, [key]: value } : prev)
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => editMutation.mutate(diff)}
                disabled={!hayCambios || editMutation.isPending}
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
  isAssigned,
  onAssign,
  isLoading,
}: {
  cuadrilla: { id: string; nombre: string; estado: string };
  distanceKm: number | null;
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

function ArchivoImage({ archivoId, alt, className }: { archivoId: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    archivosApi.urlDeArchivo(archivoId).then((u) => {
      setSrc(u);
    });
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [archivoId]);
  if (!src) return <div className={`bg-slate-200 dark:bg-slate-700 animate-pulse ${className ?? ''}`} />;
  return <img src={src} alt={alt} className={className} />;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
