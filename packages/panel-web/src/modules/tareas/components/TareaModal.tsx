import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { tareasApi } from '@/shared/services/tareas';
import { EditorItems } from '@/modules/tareas/components/EditorItems';
import { SelectorDestino, type TipoDestino } from '@/modules/tareas/components/SelectorDestino';
import { etiquetasPrioridadTarea, type ItemInput, type PrioridadTarea } from '@/types/atlas';

interface TareaModalProps {
  open: boolean;
  onClose: () => void;
  onGuardada: () => void;
}

/**
 * Alta de una tarea suelta. Cualquiera se la puede asignar a cualquiera: acá no
 * hay jerarquía, solo un responsable claro. También puede ir dirigida a un área
 * entera, y entonces la hace cualquiera del sector.
 *
 * La edición de una tarea ya creada se hace desde la tarjeta del listado
 * (estado, ítems); esto es solo el alta.
 */
export function TareaModal({ open, onClose, onGuardada }: TareaModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoDestino, setTipoDestino] = useState<TipoDestino>('empleado');
  const [empleadoId, setEmpleadoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media');
  const [venceEl, setVenceEl] = useState('');
  const [items, setItems] = useState<ItemInput[]>([]);
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  const guardar = useMutation({
    mutationFn: () =>
      tareasApi.crear({
        titulo: titulo.trim(),
        // Se manda solo el destino elegido: el otro campo ni aparece, así el
        // backend no tiene que adivinar cuál manda.
        ...(tipoDestino === 'empleado' ? { empleado_id: empleadoId } : { area_id: areaId }),
        descripcion: descripcion.trim() || null,
        prioridad,
        vence_el: venceEl ? venceEl : null,
        items: items.filter((i) => i.texto.trim() !== ''),
      }),
    onSuccess: onGuardada,
  });

  useEffect(() => {
    if (!open) return;
    setTitulo('');
    setDescripcion('');
    setTipoDestino('empleado');
    setEmpleadoId('');
    setAreaId('');
    setPrioridad('media');
    setVenceEl('');
    setItems([]);
    setErrores({});
    guardar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string | undefined> = {};
    if (!titulo.trim()) nuevos.titulo = 'Ponele un título a la tarea.';
    if (tipoDestino === 'empleado' && !empleadoId) nuevos.destino = 'Elegí quién la tiene que hacer.';
    if (tipoDestino === 'area' && !areaId) nuevos.destino = 'Elegí el área a la que va dirigida.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    guardar.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea" size="lg">
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo crear la tarea">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <Input
          label="¿Qué hay que hacer? *"
          placeholder="Ej. Limpieza de oficinas"
          value={titulo}
          error={errores.titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Detalle
          </label>
          <textarea
            className="input min-h-[70px]"
            placeholder="Aclaraciones, dónde, con qué..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectorDestino
            tipo={tipoDestino}
            empleadoId={empleadoId}
            areaId={areaId}
            onTipo={(t) => {
              setTipoDestino(t);
              setErrores((prev) => ({ ...prev, destino: undefined }));
            }}
            onEmpleado={(id) => {
              setEmpleadoId(id);
              setErrores((prev) => ({ ...prev, destino: undefined }));
            }}
            onArea={(id) => {
              setAreaId(id);
              setErrores((prev) => ({ ...prev, destino: undefined }));
            }}
            error={errores.destino}
            activo={open}
          />
          <Select
            label="Prioridad"
            options={Object.entries(etiquetasPrioridadTarea).map(([value, label]) => ({ value, label }))}
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as PrioridadTarea)}
          />
          <Input
            label="Vence"
            type="datetime-local"
            value={venceEl}
            onChange={(e) => setVenceEl(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <EditorItems items={items} onChange={setItems} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
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
