import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { etiquetasTipoItem, type ItemInput, type TipoItemTarea } from '@/types/atlas';

/**
 * Editor de la lista de ítems, compartido por la tarea suelta y la plantilla.
 *
 * No son solo tildes: un ítem puede pedir un texto o un número. Eso es lo que
 * convierte una tarea recurrente en un parte diario — "cuántos afectados hay",
 * "qué se revisó" — con la respuesta guardada día por día.
 */
export function EditorItems({
  items,
  onChange,
}: {
  items: ItemInput[];
  onChange: (items: ItemInput[]) => void;
}) {
  const actualizar = (indice: number, cambios: Partial<ItemInput>) => {
    onChange(items.map((item, i) => (i === indice ? { ...item, ...cambios } : item)));
  };

  const quitar = (indice: number) => {
    onChange(items.filter((_, i) => i !== indice));
  };

  const agregar = () => {
    onChange([...items, { texto: '', tipo: 'tilde', obligatorio: false }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Lista de control</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lo que hay que hacer, punto por punto. Un ítem puede pedir un dato en vez de solo tildarse.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={agregar}>
          Agregar ítem
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          Sin ítems. La tarea se va a poder marcar como hecha directamente.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, indice) => (
            <div
              key={indice}
              className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
            >
              <GripVertical className="w-4 h-4 text-slate-300 mt-2.5 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
                <Input
                  placeholder="Ej. Limpiar los baños"
                  value={item.texto}
                  onChange={(e) => actualizar(indice, { texto: e.target.value })}
                />
                <Select
                  options={Object.entries(etiquetasTipoItem).map(([value, label]) => ({ value, label }))}
                  value={item.tipo ?? 'tilde'}
                  onChange={(e) => actualizar(indice, { tipo: e.target.value as TipoItemTarea })}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!item.obligatorio}
                    onChange={(e) => actualizar(indice, { obligatorio: e.target.checked })}
                    className="rounded border-slate-300 text-atlas-600 focus:ring-atlas-500"
                  />
                  Obligatorio: sin esto no se puede dar la tarea por hecha
                </label>
              </div>
              <button
                type="button"
                onClick={() => quitar(indice)}
                title="Quitar ítem"
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
