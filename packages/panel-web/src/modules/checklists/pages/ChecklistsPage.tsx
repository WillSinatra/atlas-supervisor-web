import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ListChecks,
  Plus,
  PowerOff,
  RotateCcw,
  Save,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { plantillasChecklistApi } from '@/shared/services/checklist';
import { TIPOS_ORDEN, tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import { etiquetasTipoItemChecklist } from '@/types/atlas';
import type { ItemPlantillaInput, PlantillaChecklist, TipoItemChecklist } from '@/types/atlas';

/**
 * Plantillas de checklist: lo que el técnico tiene que relevar en cada tipo de
 * orden. Se copian a cada OT al crearse, así que editar acá rige para las
 * órdenes nuevas y no reescribe el histórico de las que ya existen.
 *
 * Los tipos de orden no son un enumerado en la API —`tipo_orden` es texto
 * libre—, por eso la lista de la izquierda mezcla los cinco que usa el panel
 * con cualquier otro que tenga una plantilla cargada. Si estuviera atada a la
 * constante del panel, una plantilla creada para otro tipo quedaría invisible.
 */

/** Etiqueta legible de un tipo, sea de los conocidos o uno cargado a mano. */
function etiquetaTipo(tipo: string): string {
  const conocida = (tipoOrdenLabels as Record<string, string>)[tipo];
  if (conocida) return conocida;
  const limpio = tipo.replace(/_/g, ' ');
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export default function ChecklistsPage() {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<string>('instalacion');
  const [items, setItems] = useState<ItemPlantillaInput[]>([]);
  const [sucio, setSucio] = useState(false);
  const [verInactivas, setVerInactivas] = useState(false);
  /**
   * Qué se está administrando. Son dos listas distintas para el mismo tipo de
   * trabajo: una la completa N2 antes de despachar, la otra el técnico en el
   * domicilio.
   */
  const [ambito, setAmbito] = useState<'orden' | 'ticket'>('orden');
  const [modalNueva, setModalNueva] = useState(false);

  const { data: plantillas, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['checklist-plantillas', ambito, verInactivas],
    queryFn: () => plantillasChecklistApi.listar({ ambito, incluir_inactivas: verInactivas }),
  });

  const activas = useMemo(() => (plantillas ?? []).filter((p) => p.activo), [plantillas]);
  const inactivas = useMemo(() => (plantillas ?? []).filter((p) => !p.activo), [plantillas]);

  // Los cinco de siempre, más los tipos que tengan plantilla y no estén en esa
  // lista. Sin esto, un checklist creado para un tipo propio no se vería.
  const tipos = useMemo(() => {
    const vistos = new Set<string>(TIPOS_ORDEN);
    activas.forEach((p) => vistos.add(p.tipo_orden));
    return [...vistos];
  }, [activas]);

  const plantilla: PlantillaChecklist | undefined = activas.find((p) => p.tipo_orden === tipo);

  useEffect(() => {
    setItems(
      (plantilla?.items ?? []).map((i) => ({
        clave: i.clave,
        texto: i.texto,
        tipo: i.tipo,
        obligatorio: i.obligatorio,
      })),
    );
    setSucio(false);
  }, [plantilla?.id, plantilla?.items]);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['checklist-plantillas'] });

  const guardar = useMutation({
    mutationFn: () =>
      plantilla
        ? plantillasChecklistApi.actualizar(plantilla.id, { items })
        : plantillasChecklistApi.crear({
            tipo_orden: tipo,
            ambito,
            nombre: `${ambito === 'ticket' ? 'Verificación de' : 'Checklist de'} ${etiquetaTipo(tipo).toLowerCase()}`,
            items,
          }),
    onSuccess: () => {
      refrescar();
      setSucio(false);
    },
  });

  const crearPlantilla = useMutation({
    mutationFn: (payload: { tipo_orden: string; ambito: 'orden' | 'ticket'; nombre: string; items: ItemPlantillaInput[] }) =>
      plantillasChecklistApi.crear(payload),
    onSuccess: (nueva) => {
      refrescar();
      setTipo(nueva.tipo_orden);
      setModalNueva(false);
    },
  });

  const desactivar = useMutation({
    mutationFn: (id: string) => plantillasChecklistApi.desactivar(id),
    onSuccess: refrescar,
  });

  const reactivar = useMutation({
    mutationFn: (id: string) => plantillasChecklistApi.actualizar(id, { activo: true }),
    onSuccess: refrescar,
  });

  const cambiar = (i: number, cambios: Partial<ItemPlantillaInput>) => {
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...cambios } : item)));
    setSucio(true);
  };

  const mover = (i: number, delta: number) => {
    const destino = i + delta;
    if (destino < 0 || destino >= items.length) return;
    const copia = [...items];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    setItems(copia);
    setSucio(true);
  };

  const agregar = () => {
    setItems([...items, { texto: '', tipo: 'tilde', obligatorio: true }]);
    setSucio(true);
  };

  const quitar = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
    setSucio(true);
  };

  const vacios = items.some((i) => i.texto.trim() === '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Checklists</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {ambito === 'orden'
              ? 'Lo que el técnico tiene que relevar en el domicilio. Se aplica a las órdenes que se creen después de guardar: las que ya existen conservan el checklist con el que nacieron.'
              : 'Lo que N2 tiene que descartar antes de mandar un técnico. Mientras queden ítems obligatorios sin responder, el ticket no se puede convertir en orden de trabajo.'}
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalNueva(true)}>
          Nuevo checklist
        </Button>
      </div>

      {/* Dos listas para el mismo tipo de trabajo, en dos momentos distintos.
          Sin esta separación, las de verificación existían pero no había desde
          dónde verlas ni editarlas. */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800">
        {([
          { valor: 'orden', etiqueta: 'Del técnico en el sitio' },
          { valor: 'ticket', etiqueta: 'Verificación de N2 (ticket)' },
        ] as const).map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => setAmbito(op.valor)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              ambito === op.valor
                ? 'bg-atlas-600 text-white font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {op.etiqueta}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudieron cargar las plantillas"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          <div className="space-y-3">
            <div className="card p-3">
              {tipos.map((t) => {
                const p = activas.find((x) => x.tipo_orden === t);
                const activo = t === tipo;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left ${
                      activo
                        ? 'bg-atlas-50 text-atlas-700 dark:bg-atlas-900/30 dark:text-atlas-300 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="truncate">{etiquetaTipo(t)}</span>
                    <Badge variant={p && p.items_count > 0 ? 'neutral' : 'warning'}>
                      {p?.items_count ?? 0}
                    </Badge>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline px-1"
              onClick={() => setVerInactivas(!verInactivas)}
            >
              {verInactivas ? 'Ocultar reemplazadas' : 'Ver versiones reemplazadas'}
            </button>

            {verInactivas && (
              <div className="card p-3 space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Reemplazadas
                </p>
                {inactivas.length === 0 ? (
                  <p className="text-xs text-slate-400">Ninguna todavía.</p>
                ) : (
                  inactivas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-slate-500 dark:text-slate-400">
                        {etiquetaTipo(p.tipo_orden)} · {p.items_count} ítems
                      </span>
                      <button
                        type="button"
                        title="Volver a usarla (reemplaza la activa de ese tipo)"
                        className="text-slate-400 hover:text-atlas-600 shrink-0"
                        onClick={() => reactivar.mutate(p.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
                <ListChecks className="w-5 h-5 text-atlas-600 shrink-0" />
                <span className="truncate">{etiquetaTipo(tipo)}</span>
              </h3>
              <div className="flex gap-2 shrink-0">
                {plantilla && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<PowerOff className="w-4 h-4" />}
                    loading={desactivar.isPending}
                    onClick={() => desactivar.mutate(plantilla.id)}
                    title="Las OT nuevas de este tipo dejan de tener checklist"
                  >
                    Desactivar
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={agregar}>
                  Agregar ítem
                </Button>
                <Button
                  size="sm"
                  icon={<Save className="w-4 h-4" />}
                  loading={guardar.isPending}
                  disabled={!sucio || vacios}
                  onClick={() => guardar.mutate()}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {(guardar.isError || desactivar.isError || reactivar.isError) && (
              <div className="mb-3">
                <Alert variant="error" title="No se pudo guardar">
                  {mensajeDeError(guardar.error ?? desactivar.error ?? reactivar.error)}
                </Alert>
              </div>
            )}
            {sucio && (
              <div className="mb-3">
                <Alert variant="warning">Hay cambios sin guardar.</Alert>
              </div>
            )}
            {vacios && (
              <div className="mb-3">
                <Alert variant="info">Todos los ítems necesitan un texto para poder guardar.</Alert>
              </div>
            )}
            {!(TIPOS_ORDEN as readonly string[]).includes(tipo) && (
              <div className="mb-3">
                <Alert variant="info" title="Tipo de orden propio">
                  Las órdenes que se crean desde el panel solo pueden ser de los cinco tipos habituales, así que
                  este checklist se va a aplicar únicamente a las OT de tipo <b>{tipo}</b> que entren por la API
                  o por una integración.
                </Alert>
              </div>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Este tipo de orden no tiene checklist. Las OT de {etiquetaTipo(tipo).toLowerCase()} se crean sin
                ítems y se pueden cerrar sin relevar nada.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        title="Subir"
                        disabled={i === 0}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        onClick={() => mover(i, -1)}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Bajar"
                        disabled={i === items.length - 1}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        onClick={() => mover(i, 1)}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        className="input py-1.5"
                        placeholder="Qué hay que relevar"
                        value={item.texto}
                        onChange={(e) => cambiar(i, { texto: e.target.value })}
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-32">
                          <Select
                            options={Object.entries(etiquetasTipoItemChecklist).map(([value, label]) => ({
                              value,
                              label,
                            }))}
                            value={item.tipo}
                            onChange={(e) => cambiar(i, { tipo: e.target.value as TipoItemChecklist })}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-600"
                            checked={item.obligatorio}
                            onChange={(e) => cambiar(i, { obligatorio: e.target.checked })}
                          />
                          Bloquea el cierre
                        </label>
                        {item.clave && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            clave: {item.clave}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Quitar"
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 pt-1"
                      onClick={() => quitar(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              La <b>clave</b> es el identificador con el que la app móvil manda las respuestas. Se conserva al
              editar el texto: renombrar un ítem no invalida lo ya relevado. Los ítems nuevos reciben una clave
              derivada de su texto.
            </p>
          </div>
        </div>
      )}

      <ModalNuevoChecklist
        open={modalNueva}
        ambito={ambito}
        onClose={() => setModalNueva(false)}
        existentes={activas}
        tiposUsados={activas.map((p) => p.tipo_orden)}
        guardando={crearPlantilla.isPending}
        error={crearPlantilla.isError ? mensajeDeError(crearPlantilla.error) : null}
        onCrear={(payload) => crearPlantilla.mutate(payload)}
      />
    </div>
  );
}

interface ModalNuevoChecklistProps {
  open: boolean;
  /** El que se está administrando: la plantilla nueva nace en ese mismo. */
  ambito: 'orden' | 'ticket';
  onClose: () => void;
  existentes: PlantillaChecklist[];
  tiposUsados: string[];
  guardando: boolean;
  error: string | null;
  onCrear: (payload: { tipo_orden: string; ambito: 'orden' | 'ticket'; nombre: string; items: ItemPlantillaInput[] }) => void;
}

/** Alta de una plantilla, opcionalmente copiando los ítems de otra. */
function ModalNuevoChecklist({
  open,
  ambito,
  onClose,
  existentes,
  tiposUsados,
  guardando,
  error,
  onCrear,
}: ModalNuevoChecklistProps) {
  const [tipoElegido, setTipoElegido] = useState('instalacion');
  const [tipoPropio, setTipoPropio] = useState('');
  const [nombre, setNombre] = useState('');
  const [copiarDe, setCopiarDe] = useState('');

  useEffect(() => {
    if (!open) return;
    setTipoElegido('instalacion');
    setTipoPropio('');
    setNombre('');
    setCopiarDe('');
  }, [open]);

  const esPropio = tipoElegido === '__otro__';
  // La clave se normaliza igual que en la API, para que "Corte por mora" y
  // "corte_por_mora" no terminen siendo dos tipos distintos.
  const tipoFinal = esPropio
    ? tipoPropio
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // marcas de acento, ya separadas por NFD
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : tipoElegido;

  const yaExiste = tipoFinal !== '' && tiposUsados.includes(tipoFinal);
  const puedeCrear = tipoFinal !== '' && !guardando;

  const opcionesTipo = [
    ...TIPOS_ORDEN.map((t) => ({ value: t, label: etiquetaTipo(t) })),
    { value: '__otro__', label: 'Otro (escribirlo)' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Nuevo checklist" size="md">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Select
          label="Tipo de orden"
          options={opcionesTipo}
          value={tipoElegido}
          onChange={(e) => setTipoElegido(e.target.value)}
        />

        {esPropio && (
          <div>
            <Input
              label="Nombre del tipo"
              placeholder="Ej: Relevamiento"
              value={tipoPropio}
              onChange={(e) => setTipoPropio(e.target.value)}
            />
            {tipoFinal !== '' && (
              <p className="text-xs text-slate-400 mt-1">
                Se va a guardar como <code>{tipoFinal}</code>.
              </p>
            )}
          </div>
        )}

        <Input
          label="Nombre del checklist (opcional)"
          placeholder={tipoFinal ? `Checklist de ${etiquetaTipo(tipoFinal).toLowerCase()}` : 'Checklist de…'}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <Select
          label="Copiar los ítems de (opcional)"
          placeholder="Empezar vacío"
          options={existentes.map((p) => ({
            value: p.id,
            label: `${etiquetaTipo(p.tipo_orden)} — ${p.items_count} ítems`,
          }))}
          value={copiarDe}
          onChange={(e) => setCopiarDe(e.target.value)}
        />

        {yaExiste && (
          <Alert variant="warning">
            Ya hay un checklist activo para <b>{etiquetaTipo(tipoFinal)}</b>. El nuevo lo reemplaza; el anterior
            queda guardado y se puede volver a activar desde “Ver versiones reemplazadas”.
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={guardando}
            disabled={!puedeCrear}
            onClick={() => {
              const base = existentes.find((p) => p.id === copiarDe);
              onCrear({
                tipo_orden: tipoFinal,
                ambito,
                nombre: nombre.trim() || `Checklist de ${etiquetaTipo(tipoFinal).toLowerCase()}`,
                // Sin la clave: al copiar a otro tipo conviene que se deriven de
                // nuevo, y si se conservaran quedarían atadas a la plantilla origen.
                items: (base?.items ?? []).map((i) => ({
                  texto: i.texto,
                  tipo: i.tipo,
                  obligatorio: i.obligatorio,
                })),
              });
            }}
          >
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  );
}
