import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { plantillasApi } from '@/shared/services/tareas';
import { EditorItems } from '@/modules/tareas/components/EditorItems';
import { SelectorDestino, type TipoDestino } from '@/modules/tareas/components/SelectorDestino';
import {
  diasDeLaSemana,
  etiquetasPrioridadTarea,
  etiquetasRecurrencia,
  type ItemInput,
  type PrioridadTarea,
  type Recurrencia,
  type TareaPlantilla,
} from '@/types/atlas';

interface PlantillaModalProps {
  open: boolean;
  /** null = alta; con plantilla = edición. */
  plantilla: TareaPlantilla | null;
  onClose: () => void;
  onGuardada: () => void;
}

/**
 * La tarea que se repite sola. El cron la materializa cada día que toca, y por
 * eso el caso de limpieza o el parte del NOC deja de depender de que alguien se
 * acuerde de cargarla todas las mañanas.
 *
 * Puede generarse para una persona o para un área entera. Dirigida al área no
 * hay que reasignarla cuando cambia el turno: la del día la toma quien esté.
 */
export function PlantillaModal({ open, plantilla, onClose, onGuardada }: PlantillaModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoDestino, setTipoDestino] = useState<TipoDestino>('empleado');
  const [empleadoId, setEmpleadoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media');
  const [recurrencia, setRecurrencia] = useState<Recurrencia>('diaria');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [diaMes, setDiaMes] = useState('1');
  const [hora, setHora] = useState('08:00');
  const [activo, setActivo] = useState(true);
  const [items, setItems] = useState<ItemInput[]>([]);
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        titulo: titulo.trim(),
        // Al editar se manda también el destino que queda vacío, en null: es lo
        // que le dice al backend "ahora va al otro lado", en vez de dejar los dos.
        empleado_id: tipoDestino === 'empleado' ? empleadoId : null,
        area_id: tipoDestino === 'area' ? areaId : null,
        descripcion: descripcion.trim() || null,
        prioridad,
        recurrencia,
        hora,
        activo,
        items: items.filter((i) => i.texto.trim() !== ''),
        ...(recurrencia === 'semanal' ? { dias_semana: diasSemana } : {}),
        ...(recurrencia === 'mensual' ? { dia_mes: Number(diaMes) } : {}),
      };
      return plantilla ? plantillasApi.actualizar(plantilla.id, payload) : plantillasApi.crear(payload);
    },
    onSuccess: onGuardada,
  });

  useEffect(() => {
    if (!open) return;
    setTitulo(plantilla?.titulo ?? '');
    setDescripcion(plantilla?.descripcion ?? '');
    setTipoDestino(plantilla?.area ? 'area' : 'empleado');
    setEmpleadoId(plantilla?.empleado?.id ?? '');
    setAreaId(plantilla?.area?.id ?? '');
    setPrioridad(plantilla?.prioridad ?? 'media');
    setRecurrencia(plantilla?.recurrencia ?? 'diaria');
    setDiasSemana(plantilla?.dias_semana?.length ? plantilla.dias_semana : [1, 2, 3, 4, 5]);
    setDiaMes(String(plantilla?.dia_mes ?? 1));
    setHora(plantilla?.hora ?? '08:00');
    setActivo(plantilla?.activo ?? true);
    setItems(
      plantilla?.items.map((i) => ({ texto: i.texto, tipo: i.tipo, obligatorio: i.obligatorio })) ?? [],
    );
    setErrores({});
    guardar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plantilla]);

  const alternarDia = (valor: number) => {
    setDiasSemana((prev) => (prev.includes(valor) ? prev.filter((d) => d !== valor) : [...prev, valor].sort()));
    setErrores((prev) => ({ ...prev, dias: undefined }));
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string | undefined> = {};
    if (!titulo.trim()) nuevos.titulo = 'Ponele un título.';
    if (tipoDestino === 'empleado' && !empleadoId) nuevos.destino = 'Elegí quién la tiene que hacer.';
    if (tipoDestino === 'area' && !areaId) nuevos.destino = 'Elegí el área a la que va dirigida.';
    if (recurrencia === 'semanal' && diasSemana.length === 0) {
      nuevos.dias = 'Elegí al menos un día.';
    }
    if (recurrencia === 'mensual') {
      const n = Number(diaMes);
      if (!Number.isInteger(n) || n < 1 || n > 31) nuevos.diaMes = 'Un día del 1 al 31.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    guardar.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plantilla ? 'Editar tarea recurrente' : 'Nueva tarea recurrente'}
      size="lg"
    >
      <form onSubmit={enviar} className="space-y-4">
        {guardar.isError && (
          <Alert variant="error" title="No se pudo guardar">
            {mensajeDeError(guardar.error)}
          </Alert>
        )}

        <Input
          label="¿Qué hay que hacer? *"
          placeholder="Ej. Parte diario del NOC"
          value={titulo}
          error={errores.titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Detalle</label>
          <textarea
            className="input min-h-[60px]"
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
          <Input label="Hora de vencimiento" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <Select
            label="¿Cada cuánto se repite?"
            options={Object.entries(etiquetasRecurrencia).map(([value, label]) => ({ value, label }))}
            value={recurrencia}
            onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
          />

          {recurrencia === 'semanal' && (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Días</p>
              <div className="flex flex-wrap gap-2">
                {diasDeLaSemana.map((dia) => {
                  const elegido = diasSemana.includes(dia.valor);
                  return (
                    <button
                      key={dia.valor}
                      type="button"
                      title={dia.largo}
                      onClick={() => alternarDia(dia.valor)}
                      className={`w-11 h-9 rounded-lg text-sm font-medium border transition-colors ${
                        elegido
                          ? 'bg-atlas-600 text-white border-atlas-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {dia.corto}
                    </button>
                  );
                })}
              </div>
              {errores.dias && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errores.dias}</p>}
            </div>
          )}

          {recurrencia === 'mensual' && (
            <Input
              label="Día del mes"
              type="number"
              min={1}
              max={31}
              value={diaMes}
              error={errores.diaMes}
              onChange={(e) => setDiaMes(e.target.value)}
            />
          )}

          {recurrencia === 'mensual' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Si el mes no llega a ese día (un 31 en febrero), la tarea sale el último día del mes.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
            />
            Activa: se siguen generando las tareas
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <EditorItems items={items} onChange={setItems} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {plantilla ? 'Guardar cambios' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
