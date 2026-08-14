import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2, User } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { tareasApi } from '@/shared/services/tareas';
import { EditorItems } from '@/modules/tareas/components/EditorItems';
import { etiquetasPrioridadTarea, type Cuadrilla, type ItemInput, type PrioridadTarea } from '@/types/atlas';

interface MaintenanceTaskType {
  id: string;
  label: string;
  items: string[];
}

const TIPOS_MANTENIMIENTO: MaintenanceTaskType[] = [
  {
    id: 'cambio_aceite',
    label: 'Cambio de aceite',
    items: ['Drenaje completado', 'Filtro reemplazado', 'Nuevo aceite cargado', 'Revisión nivel'],
  },
  {
    id: 'revision_frenos',
    label: 'Revisión de frenos',
    items: ['Pastillas inspeccionadas', 'Discos sin daño', 'Liquido de frenos OK', 'Prueba de frenado'],
  },
  {
    id: 'inspeccion_neumaticos',
    label: 'Inspección de neumáticos',
    items: ['Presión verificada', 'Desgaste uniforme', 'Sin daños', 'Rotación hecha'],
  },
  {
    id: 'cambio_filtro',
    label: 'Cambio de filtro',
    items: ['Filtro removido', 'Nuevo filtro instalado', 'Sello verificado'],
  },
  {
    id: 'revision_general',
    label: 'Revisión general',
    items: ['Motor OK', 'Fluidos OK', 'Luces OK', 'Suspensión OK'],
  },
  { id: 'otro', label: 'Otro', items: [] },
];

type QuienLaHace = 'area' | 'empleado';

/** Ítems predeterminados como tilde obligatoria: alcanza con marcar hecho/no hecho. */
const itemsDeTipo = (tipo: MaintenanceTaskType): ItemInput[] =>
  tipo.items.map((texto) => ({ texto, tipo: 'tilde', obligatorio: true }));

interface MaintenanceTaskModalProps {
  crew: Cuadrilla;
  open: boolean;
  onClose: () => void;
  onCreada: () => void;
}

/**
 * Alta rápida de una tarea de mantenimiento del vehículo, prefijada con la
 * cuadrilla actual. Es un wrapper sobre /v1/tareas (Pedido 10): no reemplaza
 * ni toca el modal de tareas sueltas, solo precarga título, ítems por tipo de
 * mantenimiento y restringe el destino a la gente de esta cuadrilla.
 */
export function MaintenanceTaskModal({ crew, open, onClose, onCreada }: MaintenanceTaskModalProps) {
  const [tipoId, setTipoId] = useState(TIPOS_MANTENIMIENTO[0].id);
  const [otroTexto, setOtroTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tituloEditadoAMano, setTituloEditadoAMano] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [quien, setQuien] = useState<QuienLaHace>('area');
  const [empleadoId, setEmpleadoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media');
  const [venceEl, setVenceEl] = useState('');
  const [items, setItems] = useState<ItemInput[]>(itemsDeTipo(TIPOS_MANTENIMIENTO[0]));
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  // Técnicos que salen del padrón (tienen empleado_id): son los únicos a los
  // que se les puede asignar una tarea, que vive contra empleados, no técnicos.
  const tecnicosDelPadron = (crew.tecnicos ?? []).filter((t) => !!t.empleado_id);
  const areasDeLaCuadrilla = crew.areas ?? [];

  const tituloAutogenerado = (etiqueta: string) => `${crew.nombre} - Mantenimiento: ${etiqueta}`;

  useEffect(() => {
    if (!open) return;
    setTipoId(TIPOS_MANTENIMIENTO[0].id);
    setOtroTexto('');
    setTitulo(tituloAutogenerado(TIPOS_MANTENIMIENTO[0].label));
    setTituloEditadoAMano(false);
    setDescripcion('');
    setQuien('area');
    setEmpleadoId('');
    setAreaId(areasDeLaCuadrilla[0]?.id ?? '');
    setPrioridad('media');
    setVenceEl('');
    setItems(itemsDeTipo(TIPOS_MANTENIMIENTO[0]));
    setErrores({});
    guardar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cambiar el tipo rearma título e ítems, salvo que ya los hayan tocado a
  // mano: ahí se respeta lo que el usuario dejó.
  const elegirTipo = (id: string) => {
    setTipoId(id);
    const tipo = TIPOS_MANTENIMIENTO.find((t) => t.id === id) ?? TIPOS_MANTENIMIENTO[0];
    if (!tituloEditadoAMano) {
      setTitulo(tituloAutogenerado(id === 'otro' ? otroTexto.trim() || 'Otro' : tipo.label));
    }
    setItems(itemsDeTipo(tipo));
  };

  const cambiarOtroTexto = (texto: string) => {
    setOtroTexto(texto);
    if (tipoId === 'otro' && !tituloEditadoAMano) {
      setTitulo(tituloAutogenerado(texto.trim() || 'Otro'));
    }
  };

  const hoyISO = new Date().toISOString().slice(0, 16);

  const guardar = useMutation({
    mutationFn: () =>
      tareasApi.crear({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        ...(quien === 'empleado' ? { empleado_id: empleadoId } : { area_id: areaId }),
        prioridad,
        vence_el: venceEl,
        items: items.filter((i) => i.texto.trim() !== ''),
      }),
    onSuccess: () => {
      onCreada();
      onClose();
    },
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string | undefined> = {};
    if (!titulo.trim()) nuevos.titulo = 'Ponele un título a la tarea.';
    if (!venceEl) nuevos.vence_el = 'Elegí cuándo vence.';
    else if (venceEl < hoyISO) nuevos.vence_el = 'No puede vencer en el pasado.';
    if (items.filter((i) => i.texto.trim() !== '').length === 0) {
      nuevos.items = 'Agregá al menos un ítem de control.';
    }
    if (quien === 'empleado' && !empleadoId) nuevos.destino = 'Elegí qué técnico la hace.';
    if (quien === 'area' && !areaId) nuevos.destino = 'Esta cuadrilla no tiene un área para asignarle la tarea.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    guardar.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tarea de mantenimiento" size="xl">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo crear la tarea">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección 1: tipo, título, detalle, destino, prioridad y vencimiento. */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Mantenimiento</h4>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de mantenimiento
              </label>
              <Select
                options={TIPOS_MANTENIMIENTO.map((t) => ({ value: t.id, label: t.label }))}
                value={tipoId}
                onChange={(e) => elegirTipo(e.target.value)}
              />
            </div>

            {tipoId === 'otro' && (
              <Input
                label="¿Qué tipo de mantenimiento es?"
                placeholder="Ej. Alineación y balanceo"
                value={otroTexto}
                onChange={(e) => cambiarOtroTexto(e.target.value)}
              />
            )}

            <Input
              label="Título *"
              value={titulo}
              error={errores.titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTituloEditadoAMano(true);
              }}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Detalle
              </label>
              <textarea
                className="input min-h-[70px]"
                placeholder="Aclaraciones sobre el mantenimiento..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                ¿Quién la hace? *
              </label>
              <div className="flex gap-1 p-1 mb-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setQuien('area');
                    setErrores((prev) => ({ ...prev, destino: undefined }));
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    quien === 'area'
                      ? 'bg-white dark:bg-slate-800 text-atlas-700 dark:text-atlas-300 shadow-sm font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Un área
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuien('empleado');
                    setErrores((prev) => ({ ...prev, destino: undefined }));
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    quien === 'empleado'
                      ? 'bg-white dark:bg-slate-800 text-atlas-700 dark:text-atlas-300 shadow-sm font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" /> Una persona
                </button>
              </div>

              {quien === 'area' ? (
                areasDeLaCuadrilla.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Esta cuadrilla no tiene un área propia (sale de las áreas de sus técnicos). Elegí "Una
                    persona" en su lugar.
                  </p>
                ) : (
                  <Select
                    placeholder="Elegir área"
                    options={areasDeLaCuadrilla.map((a) => ({ value: a.id, label: a.nombre }))}
                    value={areaId}
                    error={errores.destino}
                    onChange={(e) => {
                      setAreaId(e.target.value);
                      setErrores((prev) => ({ ...prev, destino: undefined }));
                    }}
                  />
                )
              ) : tecnicosDelPadron.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ningún técnico de esta cuadrilla viene del padrón de empleados todavía.
                </p>
              ) : (
                <Select
                  placeholder="Elegir técnico"
                  options={tecnicosDelPadron.map((t) => ({ value: t.empleado_id as string, label: t.nombre }))}
                  value={empleadoId}
                  error={errores.destino}
                  onChange={(e) => {
                    setEmpleadoId(e.target.value);
                    setErrores((prev) => ({ ...prev, destino: undefined }));
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Prioridad"
                options={Object.entries(etiquetasPrioridadTarea).map(([value, label]) => ({ value, label }))}
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as PrioridadTarea)}
              />
              <Input
                label="Vence *"
                type="datetime-local"
                value={venceEl}
                error={errores.vence_el}
                onChange={(e) => setVenceEl(e.target.value)}
              />
            </div>
          </div>

          {/* Sección 2: lista de control. */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Lista de control</h4>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 max-h-[26rem] overflow-y-auto">
              <EditorItems items={items} onChange={setItems} />
            </div>
            {errores.items && <p className="text-xs text-red-500">{errores.items}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Crear tarea
          </Button>
        </div>
      </form>
    </Modal>
  );
}
