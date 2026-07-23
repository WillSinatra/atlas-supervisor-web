import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Navigation, Pencil } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Modal } from '@/shared/components/ui/Modal';
import { ordenesApi, clientesApi, cuadrillasApi, mensajeDeError } from '@/shared/services/api';
import { haversineDistanceKm } from '@/shared/utils/geo';
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
import type { EditarOrdenInput, Orden } from '@/types/atlas';

const eventoLabels: Record<string, string> = {
  creada: 'Orden creada',
  actualizada: 'Datos actualizados',
  asignada: 'Asignada a cuadrilla',
};

// La orden termina su ciclo de vida en estos estados: ya no acepta cambios desde el panel.
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

// Solo los campos que cambiaron respecto a la orden original, en el shape que espera el PATCH.
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

  const { data: orden, isLoading, isError, error } = useQuery({
    queryKey: ['orden', id],
    queryFn: () => ordenesApi.detalle(id!),
    enabled: !!id,
  });

  const { data: cliente } = useQuery({
    queryKey: ['cliente', orden?.cliente_id],
    queryFn: () => clientesApi.detalle(orden!.cliente_id),
    enabled: !!orden?.cliente_id,
  });

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas', 'asignacion'],
    queryFn: () => cuadrillasApi.listar(),
  });

  const assignMutation = useMutation({
    mutationFn: (cuadrillaId: string) => ordenesApi.asignar(id!, cuadrillaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden', id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editOriginal, setEditOriginal] = useState<CamposComunesValues | null>(null);
  const [editForm, setEditForm] = useState<CamposComunesValues | null>(null);

  const editMutation = useMutation({
    mutationFn: (patch: EditarOrdenInput) => ordenesApi.actualizar(id!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden', id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      setEditOpen(false);
    },
  });

  const edicionBloqueada = orden ? ESTADOS_BLOQUEADOS.includes(orden.estado) : false;

  const openEdit = () => {
    if (!orden || edicionBloqueada) return;
    const valores = valoresDesdeOrden(orden);
    setEditOriginal(valores);
    setEditForm(valores);
    editMutation.reset();
    setEditOpen(true);
  };

  const diff = editOriginal && editForm ? calcularDiff(editOriginal, editForm) : {};
  const hayCambios = Object.keys(diff).length > 0;

  const domicilio = useMemo(
    () => cliente?.domicilios?.find((d) => d.id === orden?.domicilio_id),
    [cliente, orden],
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

  if (isLoading || !orden) {
    return (
      <div className="flex items-center justify-center h-96">
        {isError ? (
          <EmptyState
            icon={<ArrowLeft className="w-8 h-8" />}
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{orden.numero}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{orden.titulo ?? 'Sin título'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Datos generales */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos generales</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={openEdit}
                disabled={edicionBloqueada}
                title={
                  edicionBloqueada
                    ? `No se puede editar una orden ${estadoOrdenLabels[orden.estado].toLowerCase()}.`
                    : undefined
                }
              >
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Tipo" value={tipoOrdenLabels[orden.tipo as TipoOrden] ?? orden.tipo} />
              <Field label="Estado" value={<Badge variant={estadoOrdenBadgeVariant[orden.estado]}>{estadoOrdenLabels[orden.estado]}</Badge>} />
              <Field label="Prioridad" value={<Badge variant={prioridadBadgeVariant[orden.prioridad]}>{prioridadLabels[orden.prioridad]}</Badge>} />
              <Field label="Cliente" value={cliente?.nombre ?? orden.cliente_id} />
              <Field label="Domicilio" value={domicilio?.direccion ?? '—'} />
              <Field
                label="Fecha programada"
                value={orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleString('es-AR') : '—'}
              />
              {orden.tipo === 'reparacion' && (
                <Field label="Falla" value={orden.falla ? (fallaLabels[orden.falla as Falla] ?? orden.falla) : '—'} />
              )}
              <Field label="Origen" value={orden.origen === 'manual' ? 'Manual (panel)' : orden.origen} />
            </div>
            {orden.descripcion && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{orden.descripcion}</p>
              </div>
            )}
          </div>

          {/* Línea de tiempo */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Línea de tiempo</h3>
            <ol className="space-y-4">
              {orden.linea_tiempo.map((entry, idx) => (
                <li key={`${entry.tipo_evento}-${entry.creado_en}`} className="relative pl-6">
                  {idx < orden.linea_tiempo.length - 1 && (
                    <span className="absolute left-[5px] top-4 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                  <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-atlas-600" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {eventoLabels[entry.tipo_evento] ?? entry.tipo_evento}
                  </p>
                  {entry.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.descripcion}</p>}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.creado_en).toLocaleString('es-AR')}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Panel de asignación */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Asignación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {orden.cuadrilla_id
                ? `Asignada a ${cuadrillasData?.data.find((c) => c.id === orden.cuadrilla_id)?.nombre ?? orden.cuadrilla_id}`
                : 'Sin cuadrilla asignada'}
            </p>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Cuadrillas candidatas por cercanía
            </p>
            <div className="space-y-2">
              {candidateCuadrillas.map(({ cuadrilla, distanceKm }) => (
                <div
                  key={cuadrilla.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{cuadrilla.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={estadoCuadrillaBadgeVariant[cuadrilla.estado]}>{estadoCuadrillaLabels[cuadrilla.estado]}</Badge>
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
                    disabled={cuadrilla.id === orden.cuadrilla_id || cuadrilla.estado !== 'disponible' || assignMutation.isPending}
                    loading={assignMutation.isPending && assignMutation.variables === cuadrilla.id}
                    onClick={() => assignMutation.mutate(cuadrilla.id)}
                  >
                    {cuadrilla.id === orden.cuadrilla_id ? 'Asignada' : 'Asignar'}
                  </Button>
                </div>
              ))}
              {candidateCuadrillas.length === 0 && (
                <p className="text-xs text-slate-400">No hay cuadrillas cargadas.</p>
              )}
            </div>
            {assignMutation.isError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{mensajeDeError(assignMutation.error)}</p>
            )}
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
              if (!hayCambios) return;
              editMutation.mutate(diff);
            }}
          >
            <OrdenCamposComunes
              values={editForm}
              onChange={(key, value) => setEditForm({ ...editForm, [key]: value })}
              mostrarFalla={orden.tipo === 'reparacion'}
            />
            {editMutation.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">{mensajeDeError(editMutation.error)}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={editMutation.isPending} disabled={!hayCambios}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
