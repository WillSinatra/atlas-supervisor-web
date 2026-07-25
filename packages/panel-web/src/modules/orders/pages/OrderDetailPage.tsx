import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  PenTool,
  Navigation,
  Pencil,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Alert } from '@/shared/components/ui/Alert';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ordenesApi, clientesApi, cuadrillasApi, archivosApi, mensajeDeError } from '@/shared/services/api';
import { haversineDistanceKm } from '@/shared/utils/geo';
import { formatOrdenSlaRemaining, getOrdenSlaState } from '@/shared/utils/sla';
import { etiquetasEstado, etiquetasPrioridad } from '@/types/atlas';
import type { Archivo, Cliente, Cuadrilla, EstadoCuadrilla, EstadoOrden, Orden } from '@/types/atlas';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantEstadoOrden: Record<EstadoOrden, BadgeVariant> = {
  pendiente: 'neutral',
  asignada: 'info',
  aceptada: 'info',
  en_proceso: 'warning',
  completada: 'success',
  cancelada: 'danger',
};

const etiquetasEstadoCuadrilla: Record<EstadoCuadrilla, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  fuera_de_servicio: 'Fuera de servicio',
};

const variantEstadoCuadrilla: Record<EstadoCuadrilla, BadgeVariant> = {
  disponible: 'success',
  ocupada: 'warning',
  fuera_de_servicio: 'danger',
};

// Campos que la API acepta en el PATCH /v1/ordenes/{id} y que esta pantalla
// expone para edición. `notes` (mock, en inglés) no tiene equivalente real:
// se sacó del formulario en vez de mapearlo a un campo que no le corresponde.
interface OrdenEditForm {
  titulo: string;
  prioridad: Orden['prioridad'];
  descripcion: string;
  falla: string;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['orden', id],
    queryFn: () => ordenesApi.detalle(id!),
    enabled: !!id,
  });

  const { data: cliente } = useQuery<Cliente>({
    queryKey: ['cliente', order?.cliente_id],
    queryFn: () => clientesApi.detalle(order!.cliente_id),
    enabled: !!order,
  });

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'assignment-candidates'],
    queryFn: () => cuadrillasApi.listar(),
  });

  const { data: fotos } = useQuery<Archivo[]>({
    queryKey: ['orden', id, 'fotos'],
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
  const [editForm, setEditForm] = useState<OrdenEditForm | null>(null);

  const editMutation = useMutation({
    mutationFn: (patch: OrdenEditForm) => ordenesApi.actualizar(id!, patch),
    onSuccess: () => {
      invalidarOrden();
      setEditOpen(false);
    },
  });

  const openEdit = () => {
    if (!order) return;
    setEditForm({
      titulo: order.titulo ?? '',
      prioridad: order.prioridad,
      descripcion: order.descripcion ?? '',
      falla: order.falla ?? '',
    });
    setEditOpen(true);
  };

  const domicilio = cliente?.domicilios?.find((d) => d.id === order?.domicilio_id);

  const candidateCrews = useMemo(() => {
    if (!order || !cuadrillasData) return [];
    const orderLat = domicilio?.lat;
    const orderLng = domicilio?.lng;
    return [...cuadrillasData.data]
      .map((crew) => ({
        crew,
        distanceKm:
          orderLat != null && orderLng != null && crew.lat != null && crew.lng != null
            ? haversineDistanceKm(orderLat, orderLng, crew.lat, crew.lng)
            : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [order, cuadrillasData, domicilio]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center justify-center h-80">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar la orden"
            description={isError ? mensajeDeError(error) : 'Orden no encontrada.'}
          />
        </div>
      </div>
    );
  }

  const hasEvidence = !!order.firma_cliente || !!order.foto_despues || (fotos && fotos.length > 0);
  const slaState = getOrdenSlaState(order);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{order.numero}</h1>
          {order.titulo && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{order.titulo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Datos generales */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos generales</h3>
              <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={openEdit}>
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Tipo" value={order.tipo} />
              <Field label="Estado" value={<Badge variant={variantEstadoOrden[order.estado]}>{etiquetasEstado[order.estado]}</Badge>} />
              <Field label="Prioridad" value={<Badge variant="neutral">{etiquetasPrioridad[order.prioridad]}</Badge>} />
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
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{order.falla}</p>
              </div>
            )}
            {order.descripcion && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{order.descripcion}</p>
              </div>
            )}
          </div>

          {/* Línea de tiempo */}
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
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.tipo_evento}</p>
                    {entry.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.descripcion}</p>}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.creado_en).toLocaleString('es-AR')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Evidencia */}
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

        {/* Panel de asignación */}
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
              {candidateCrews.map(({ crew, distanceKm }) => (
                <CandidateCrewRow
                  key={crew.id}
                  crew={crew}
                  distanceKm={distanceKm}
                  isAssigned={crew.id === order.cuadrilla_id}
                  onAssign={() => assignMutation.mutate(crew.id)}
                  assigning={assignMutation.isPending && assignMutation.variables === crew.id}
                  disabled={assignMutation.isPending}
                />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Propuesta con cascada
              </p>
              <Button variant="outline" size="sm" disabled className="w-full">
                Próximamente
              </Button>
              <p className="text-xs text-slate-400 mt-2">
                Envía la OT a varias cuadrillas en simultáneo y asigna a la primera que acepte.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-atlas-600" /> Ubicación
            </h3>
            <div className="h-32 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
              <p className="text-xs text-slate-400">Mapa próximamente</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden de trabajo" size="md">
        {editForm && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate(editForm);
            }}
          >
            {editMutation.isError && <Alert variant="error">{mensajeDeError(editMutation.error)}</Alert>}
            <Input
              label="Título"
              value={editForm.titulo}
              onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
              required
            />
            <Select
              label="Prioridad"
              value={editForm.prioridad}
              options={Object.entries(etiquetasPrioridad).map(([value, label]) => ({ value, label }))}
              onChange={(e) => setEditForm({ ...editForm, prioridad: e.target.value as Orden['prioridad'] })}
            />
            <Input
              label="Falla"
              value={editForm.falla}
              onChange={(e) => setEditForm({ ...editForm, falla: e.target.value })}
            />
            <Input
              label="Descripción"
              value={editForm.descripcion}
              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={editMutation.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function CandidateCrewRow({
  crew,
  distanceKm,
  isAssigned,
  onAssign,
  assigning,
  disabled,
}: {
  crew: Cuadrilla;
  distanceKm: number | null;
  isAssigned: boolean;
  onAssign: () => void;
  assigning: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{crew.nombre}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={variantEstadoCuadrilla[crew.estado]}>{etiquetasEstadoCuadrilla[crew.estado]}</Badge>
          {distanceKm != null && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={isAssigned || crew.estado !== 'disponible' || disabled}
        loading={assigning}
        onClick={onAssign}
      >
        {isAssigned ? 'Asignada' : 'Asignar'}
      </Button>
    </div>
  );
}

// El detalle de la OT solo trae los IDs de archivo (firma_cliente, foto_despues,
// fotos de archivosApi.listarFotos); la descarga exige el header Authorization,
// así que no se puede usar <img src="/v1/archivos/{id}"> directo (401). Se baja
// como blob y se arma un object URL, revocado al desmontar.
function ArchivoImage({ archivoId, alt, className }: { archivoId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelado = false;
    archivosApi.urlDeArchivo(archivoId).then((u) => {
      if (cancelado) {
        URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [archivoId]);

  if (!url) {
    return <div className={`${className ?? ''} animate-pulse bg-slate-100 dark:bg-slate-700`} />;
  }
  return <img src={url} alt={alt} className={className} />;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
