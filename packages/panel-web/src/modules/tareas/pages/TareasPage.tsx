import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hand,
  Inbox,
  Radio,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Send,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { Tabs } from '@/shared/components/ui/Tabs';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { plantillasApi, tareasApi } from '@/shared/services/tareas';
import { useAuth } from '@/shared/contexts/AuthContext';
import { TareaModal } from '@/modules/tareas/components/TareaModal';
import { PlantillaModal } from '@/modules/tareas/components/PlantillaModal';
import {
  diasDeLaSemana,
  etiquetasEstadoTarea,
  etiquetasPrioridadTarea,
  etiquetasRecurrencia,
  type EstadoTarea,
  type PrioridadTarea,
  type Tarea,
  type TareaItem,
  type TareaPlantilla,
} from '@/types/atlas';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantEstado: Record<EstadoTarea, BadgeVariant> = {
  pendiente: 'neutral',
  en_curso: 'info',
  hecha: 'success',
  cancelada: 'danger',
};

const variantPrioridad: Record<PrioridadTarea, BadgeVariant> = {
  baja: 'neutral',
  media: 'info',
  alta: 'danger',
};

/**
 * Quién puede ver las tareas de todos. Es la misma lista que la API acepta en
 * `?todas=true`: pedirlo sin el rol no da error, devuelve las propias, y una
 * pestaÃ±a que miente sobre lo que muestra es peor que no tenerla.
 */
const ROLES_SUPERVISION = ['admin', 'planificador', 'despachador'];

const pestanaMias = { id: 'mias', label: 'Mis tareas', icon: <Inbox className="w-4 h-4" /> };
const pestanaRecibidas = { id: 'recibidas', label: 'Recibidas', icon: <Radio className="w-4 h-4" /> };
const pestanaPedidas = { id: 'pedidas', label: 'Las que pedí', icon: <Send className="w-4 h-4" /> };
const pestanaRecurrentes = { id: 'recurrentes', label: 'Recurrentes', icon: <Repeat className="w-4 h-4" /> };

function formatearVencimiento(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Vencida y todavía sin cerrar: es lo que hay que mirar primero. */
function estaVencida(tarea: Tarea): boolean {
  if (!tarea.vence_el || tarea.estado === 'hecha' || tarea.estado === 'cancelada') return false;
  return new Date(tarea.vence_el).getTime() < Date.now();
}

export default function TareasPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pestana, setPestana] = useState('mias');

  // "Recibidas" es lo que entra desde afuera: lo del bot, y lo que alguien dejó
  // para un sector al que no pertenezco. Sin esta pestaÃ±a, una tarea que crea
  // Botmaker no aparece en ninguna parte del panel.
  const pestanas = ROLES_SUPERVISION.includes(user?.rol ?? '')
    ? [pestanaMias, pestanaRecibidas, pestanaPedidas, pestanaRecurrentes]
    : [pestanaMias, pestanaPedidas, pestanaRecurrentes];
  const [nuevaTarea, setNuevaTarea] = useState(false);
  const [plantillaEnEdicion, setPlantillaEnEdicion] = useState<TareaPlantilla | null>(null);
  const [modalPlantilla, setModalPlantilla] = useState(false);

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
    queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tareas internas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Trabajo entre nosotros, no para un cliente. Cualquiera le puede pedir algo a cualquiera, y al otro le
            llega la notificación.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {pestana === 'recurrentes' ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setPlantillaEnEdicion(null);
                setModalPlantilla(true);
              }}
            >
              Nueva recurrente
            </Button>
          ) : (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setNuevaTarea(true)}>
              Nueva tarea
            </Button>
          )}
        </div>
      </div>

      <TareaModal
        open={nuevaTarea}
        onClose={() => setNuevaTarea(false)}
        onGuardada={() => {
          refrescar();
          setNuevaTarea(false);
        }}
      />

      <PlantillaModal
        open={modalPlantilla}
        plantilla={plantillaEnEdicion}
        onClose={() => setModalPlantilla(false)}
        onGuardada={() => {
          queryClient.invalidateQueries({ queryKey: ['plantillas'] });
          refrescar();
          setModalPlantilla(false);
        }}
      />

      <Tabs tabs={pestanas} activeTab={pestana} onTabChange={setPestana}>
        {(tabId) =>
          tabId === 'recurrentes' ? (
            <PanelRecurrentes
              onEditar={(plantilla) => {
                setPlantillaEnEdicion(plantilla);
                setModalPlantilla(true);
              }}
            />
          ) : (
            <ListaTareas
              filtro={tabId === 'pedidas' ? 'creadas_por_mi' : tabId === 'recibidas' ? 'todas' : 'mias'}
              miEmpleadoId={user?.empleado_id ?? null}
            />
          )
        }
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------------ listas ---

function ListaTareas({
  filtro,
  miEmpleadoId,
}: {
  filtro: 'mias' | 'creadas_por_mi' | 'todas';
  miEmpleadoId: string | null;
}) {
  const [verCerradas, setVerCerradas] = useState(false);
  const [soloSinTomar, setSoloSinTomar] = useState(false);

  const parametrosDelFiltro =
    filtro === 'mias'
      ? { mias: true }
      : filtro === 'creadas_por_mi'
        ? { creadas_por_mi: true }
        : { todas: true, ...(soloSinTomar ? { sin_tomar: true } : {}) };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tareas', filtro, verCerradas, soloSinTomar],
    queryFn: () =>
      tareasApi.listar({
        ...parametrosDelFiltro,
        ...(verCerradas ? {} : { pendientes: true }),
        per_page: 100,
      }),
    // Para "las que pedí": si no refresca sola, no te enterás de que la
    // completaron hasta cambiar de pestaña a mano.
    refetchInterval: 2 * 60 * 1000,
  });

  const tareas = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card">
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="No se pudieron cargar las tareas"
          description={mensajeDeError(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={verCerradas}
            onChange={(e) => setVerCerradas(e.target.checked)}
            className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
          />
          Mostrar también las hechas y canceladas
        </label>

        {/* Lo que entró y todavía no agarró nadie: es la cola real de trabajo
            pendiente de repartir. */}
        {filtro === 'todas' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={soloSinTomar}
              onChange={(e) => setSoloSinTomar(e.target.checked)}
              className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
            />
            Solo las que no tomó nadie
          </label>
        )}
      </div>

      {tareas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8" />}
            title={
              filtro === 'mias'
                ? 'No tenés nada pendiente'
                : filtro === 'creadas_por_mi'
                  ? 'No pediste ninguna tarea'
                  : soloSinTomar
                    ? 'No hay nada sin tomar'
                    : 'No entró ninguna tarea'
            }
            description={
              filtro === 'mias'
                ? 'Cuando alguien te asigne algo, te va a aparecer acá y en la campanita.'
                : filtro === 'creadas_por_mi'
                  ? 'Las tareas que le pidas a otros van a aparecer acá para seguirlas.'
                  : 'Acá aparece todo lo que entra, incluido lo que crea el bot, sin importar a qué sector vaya dirigido.'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {tareas.map((tarea) => (
            <TarjetaTarea key={tarea.id} tarea={tarea} miEmpleadoId={miEmpleadoId} />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaTarea({ tarea, miEmpleadoId }: { tarea: Tarea; miEmpleadoId: string | null }) {
  const queryClient = useQueryClient();
  const [aEliminar, setAEliminar] = useState(false);

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
    queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const tomar = useMutation({
    mutationFn: () => tareasApi.actualizar(tarea.id, { empleado_id: miEmpleadoId }),
    onSuccess: refrescar,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: EstadoTarea) => tareasApi.actualizar(tarea.id, { estado }),
    onSuccess: refrescar,
  });

  const eliminar = useMutation({
    mutationFn: () => tareasApi.eliminar(tarea.id),
    onSuccess: () => {
      refrescar();
      setAEliminar(false);
    },
  });

  const cerrada = tarea.estado === 'hecha' || tarea.estado === 'cancelada';
  const vencida = estaVencida(tarea);
  const vencimiento = formatearVencimiento(tarea.vence_el);
  const laPedi = miEmpleadoId !== null && tarea.creado_por?.id === miEmpleadoId;

  return (
    <div className={`card p-4 space-y-3 ${vencida ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-semibold ${
                tarea.estado === 'hecha'
                  ? 'text-slate-400 line-through'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {tarea.titulo}
            </h3>
            <Badge variant={variantEstado[tarea.estado]}>{etiquetasEstadoTarea[tarea.estado]}</Badge>
            {tarea.prioridad !== 'media' && (
              <Badge variant={variantPrioridad[tarea.prioridad]}>
                {etiquetasPrioridadTarea[tarea.prioridad]}
              </Badge>
            )}
            {tarea.plantilla_id && (
              <Badge variant="neutral">
                <Repeat className="w-3 h-3 mr-1" /> Recurrente
              </Badge>
            )}
          </div>
          {tarea.descripcion && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tarea.descripcion}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Para{' '}
            <strong className="text-slate-500 dark:text-slate-400">
              {tarea.empleado?.nombre ?? `${tarea.area?.nombre ?? 'el área'} · sin tomar`}
            </strong>
            {/* Cuando la tomó alguien se muestran las dos cosas: de qué sector es
                y quién quedó a cargo. */}
            {tarea.empleado && tarea.area && ` (${tarea.area.nombre})`}
            {/* Sin creador es que la cargó una integración: el bot no es un
                empleado del padrón, así que `creado_por` queda vacío. Decirlo
                evita que parezca que salió de la nada. */}
            {tarea.creado_por ? ` · la pidió ${tarea.creado_por.nombre}` : ' Â· entró por integración'}
            {vencimiento && (
              <span className={vencida ? 'text-red-500 font-medium' : ''}>
                {' '}
                · <CalendarClock className="w-3 h-3 inline mb-0.5" /> vence {vencimiento}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Tarea del sector que no agarró nadie: quien la toma queda a cargo,
              y el resto deja de verla como pendiente propia. */}
          {!cerrada && !tarea.empleado && miEmpleadoId && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Hand className="w-4 h-4" />}
              loading={tomar.isPending}
              onClick={() => tomar.mutate()}
            >
              Tomar
            </Button>
          )}
          {!cerrada && (
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              loading={cambiarEstado.isPending}
              onClick={() => cambiarEstado.mutate('hecha')}
            >
              Hecha
            </Button>
          )}
          {cerrada && (
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw className="w-4 h-4" />}
              loading={cambiarEstado.isPending}
              onClick={() => cambiarEstado.mutate('pendiente')}
            >
              Reabrir
            </Button>
          )}
          {laPedi && (
            <button
              onClick={() => setAEliminar(true)}
              title="Eliminar tarea"
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {cambiarEstado.isError && (
        <Alert variant="error" title="No se pudo actualizar">
          {mensajeDeError(cambiarEstado.error)}
        </Alert>
      )}

      {tomar.isError && (
        <Alert variant="error" title="No se pudo tomar la tarea">
          {mensajeDeError(tomar.error)}
        </Alert>
      )}

      {tarea.items_total > 0 && (
        <div className="space-y-2">
          {/* Avance de la lista. A propósito no usa ProgressBar: ese componente
              pinta de rojo todo lo que baje del 70%, y una tarea recién empezada
              no es una alarma. */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-atlas-500 transition-all"
                style={{ width: `${(tarea.items_hechos / tarea.items_total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {tarea.items_hechos}/{tarea.items_total}
            </span>
          </div>
          <div className="space-y-1">
            {tarea.items.map((item) => (
              <FilaItem key={item.id} item={item} deshabilitado={cerrada} onCambio={refrescar} />
            ))}
          </div>
        </div>
      )}

      <Modal open={aEliminar} onClose={() => setAEliminar(false)} title="Eliminar tarea" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Eliminar <strong>{tarea.titulo}</strong>? Se pierde también lo que se haya cargado en su lista.
          </p>
          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar">
              {mensajeDeError(eliminar.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAEliminar(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={eliminar.isPending} onClick={() => eliminar.mutate()}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Un renglón de la lista de control: se tilda, o se carga el dato que pide. */
function FilaItem({
  item,
  deshabilitado,
  onCambio,
}: {
  item: TareaItem;
  deshabilitado: boolean;
  onCambio: () => void;
}) {
  const [respuesta, setRespuesta] = useState(item.respuesta ?? '');

  const guardar = useMutation({
    mutationFn: (payload: { hecho?: boolean; respuesta?: string | null }) =>
      tareasApi.marcarItem(item.id, payload),
    onSuccess: onCambio,
  });

  if (item.tipo === 'tilde') {
    return (
      <label className="flex items-start gap-2 text-sm py-1 cursor-pointer">
        <input
          type="checkbox"
          checked={item.hecho}
          disabled={deshabilitado || guardar.isPending}
          onChange={(e) => guardar.mutate({ hecho: e.target.checked })}
          className="mt-0.5 rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
        />
        <span className={item.hecho ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}>
          {item.texto}
          {item.obligatorio && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
    );
  }

  // Pide un dato: se guarda al salir del campo, no en cada tecla.
  return (
    <div className="py-1">
      <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
        {item.texto}
        {item.obligatorio && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type={item.tipo === 'numero' ? 'number' : 'text'}
        value={respuesta}
        disabled={deshabilitado}
        placeholder={item.tipo === 'numero' ? 'Cargá el nÃºmero' : 'Escribí la respuesta'}
        onChange={(e) => setRespuesta(e.target.value)}
        onBlur={() => {
          if ((item.respuesta ?? '') !== respuesta) {
            guardar.mutate({ respuesta: respuesta.trim() === '' ? null : respuesta.trim() });
          }
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------- recurrentes ---

function PanelRecurrentes({ onEditar }: { onEditar: (plantilla: TareaPlantilla) => void }) {
  const queryClient = useQueryClient();
  const [aEliminar, setAEliminar] = useState<TareaPlantilla | null>(null);

  const { data: plantillas, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['plantillas'],
    queryFn: () => plantillasApi.listar(),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => plantillasApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      setAEliminar(null);
    },
  });

  const generar = useMutation({
    mutationFn: () => plantillasApi.generar(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tareas'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card">
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="No se pudieron cargar las recurrentes"
          description={mensajeDeError(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const lista = plantillas ?? [];

  return (
    <div className="space-y-4">
      <Alert variant="info" title="Se generan solas">
        Cada una crea su tarea el día que corresponde, a la hora que le pusiste. Si querés adelantarlo, generá
        las de hoy a mano.
      </Alert>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {lista.length} recurrente{lista.length === 1 ? '' : 's'}
        </span>
        <Button variant="secondary" size="sm" loading={generar.isPending} onClick={() => generar.mutate()}>
          Generar las de hoy
        </Button>
      </div>

      {generar.isSuccess && (
        <Alert variant="success" title="Listo">
          {generar.data.generadas === 0
            ? 'No había ninguna para generar: ya estaban todas.'
            : `Se generaron ${generar.data.generadas} tarea(s).`}
        </Alert>
      )}
      {generar.isError && (
        <Alert variant="error" title="No se pudo generar">
          {mensajeDeError(generar.error)}
        </Alert>
      )}

      {lista.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Sin tareas recurrentes"
            description="Sirven para lo que se repite siempre igual: la limpieza de todos los días, el parte del NOC, el cierre de mes."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((plantilla) => (
            <div key={plantilla.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{plantilla.titulo}</h3>
                    {!plantilla.activo && <Badge variant="neutral">Pausada</Badge>}
                    <Badge variant="info">{etiquetasRecurrencia[plantilla.recurrencia]}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Para{' '}
                    <strong className="text-slate-500 dark:text-slate-400">
                      {plantilla.empleado?.nombre ?? plantilla.area?.nombre ?? 'sin destinatario'}
                    </strong>
                    {!plantilla.empleado && plantilla.area && ' (todo el sector)'}
                    {' · '}
                    {plantilla.recurrencia === 'semanal' &&
                      plantilla.dias_semana
                        .map((d) => diasDeLaSemana.find((x) => x.valor === d)?.corto ?? d)
                        .join(', ')}
                    {plantilla.recurrencia === 'mensual' && `día ${plantilla.dia_mes}`}
                    {plantilla.recurrencia === 'diaria' && 'todos los días'}
                    {` a las ${plantilla.hora}`}
                    {plantilla.items.length > 0 && ` · ${plantilla.items.length} ítem(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEditar(plantilla)}
                    title="Editar"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => setAEliminar(plantilla)}
                    title="Eliminar"
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!aEliminar}
        onClose={() => {
          setAEliminar(null);
          eliminar.reset();
        }}
        title="Eliminar tarea recurrente"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Eliminar <strong>{aEliminar?.titulo}</strong>? Deja de generarse. Las tareas que ya salieron de
            ella se quedan como están.
          </p>
          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar">
              {mensajeDeError(eliminar.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={eliminar.isPending}
              onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
