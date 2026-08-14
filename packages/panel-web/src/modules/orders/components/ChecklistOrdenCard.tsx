import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { Select } from '@/shared/components/ui/Select';
import { mensajeDeError } from '@/shared/services/api';
import { checklistApi } from '@/shared/services/checklist';
import { etiquetasTipoItemChecklist } from '@/types/atlas';
import type { ItemChecklistOrden, TipoItemChecklist } from '@/types/atlas';

interface ChecklistOrdenCardProps {
  ordenId: string;
}

/**
 * Lo que el técnico relevó en el sitio. Los ítems vienen de la plantilla del
 * tipo de orden y se completan desde la app; acá el supervisor los ve y puede
 * corregirlos.
 *
 * Los obligatorios sin completar bloquean el cierre de la OT, así que el
 * resumen de arriba es lo primero que hay que poder leer de un vistazo.
 */
export function ChecklistOrdenCard({ ordenId }: ChecklistOrdenCardProps) {
  const queryClient = useQueryClient();
  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoItemChecklist>('tilde');
  const [obligatorio, setObligatorio] = useState(false);
  // El ítem que se está editando y su borrador, para no pegarle a la API en
  // cada tecla: se guarda al salir del campo.
  const [borradores, setBorradores] = useState<Record<string, string>>({});

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['orden-checklist', ordenId],
    queryFn: () => checklistApi.deOrden(ordenId),
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['orden-checklist', ordenId] });
    // El cierre de la OT depende del checklist: si cambió, la orden también.
    queryClient.invalidateQueries({ queryKey: ['orden', ordenId] });
  };

  const actualizar = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: { hecho?: boolean; respuesta?: string | null } }) =>
      checklistApi.actualizarItem(id, cambios),
    onSuccess: refrescar,
  });

  const limpiar = () => {
    setTexto('');
    setTipo('tilde');
    setObligatorio(false);
    setAgregando(false);
  };

  const agregar = useMutation({
    mutationFn: () => checklistApi.agregarAOrden(ordenId, { texto: texto.trim(), tipo, obligatorio }),
    onSuccess: () => {
      refrescar();
      limpiar();
    },
  });

  const quitar = useMutation({
    mutationFn: (id: string) => checklistApi.quitarItem(id),
    onSuccess: refrescar,
  });

  const items = checklist?.data ?? [];
  const hechos = items.filter((i) => (i.tipo === 'tilde' ? i.hecho : (i.respuesta ?? '') !== '')).length;

  // Sin ítems no es un error: son las órdenes anteriores a la migración, o un
  // tipo de OT sin plantilla cargada. Mostrarlo vacío confunde menos que
  // esconder la card entera.
  const sinChecklist = !isLoading && items.length === 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-atlas-600" /> Checklist
          {items.length > 0 && (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {hechos}/{items.length}
            </span>
          )}
        </h3>
        {!agregando && (
          <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAgregando(true)}>
            Agregar ítem
          </Button>
        )}
      </div>

      {checklist && !checklist.completo && checklist.faltantes.length > 0 && (
        <div className="mb-3">
          <Alert variant="warning" title="Falta completar para poder cerrar la orden">
            {checklist.faltantes.map((f) => f.texto).join(' · ')}
          </Alert>
        </div>
      )}
      {checklist?.completo && items.length > 0 && (
        <div className="mb-3">
          <Alert variant="success">Checklist completo.</Alert>
        </div>
      )}

      {(actualizar.isError || agregar.isError || quitar.isError) && (
        <div className="mb-3">
          <Alert variant="error">
            {mensajeDeError(actualizar.error ?? agregar.error ?? quitar.error)}
          </Alert>
        </div>
      )}

      {agregando && (
        <div className="mb-4 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Qué hay que relevar
            </label>
            <input
              className="input py-1.5"
              placeholder="Ej: Foto del tablero del cliente"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="w-36">
              <Select
                label="Tipo"
                options={Object.entries(etiquetasTipoItemChecklist).map(([value, label]) => ({ value, label }))}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoItemChecklist)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pb-2">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-600"
                checked={obligatorio}
                onChange={(e) => setObligatorio(e.target.checked)}
              />
              Bloquea el cierre
            </label>
            <div className="flex-1 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={agregar.isPending}
                disabled={texto.trim() === ''}
                onClick={() => agregar.mutate()}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : sinChecklist ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esta orden no tiene checklist. Se arma desde Configuración, con una plantilla por tipo de orden, y se
          aplica a las órdenes que se creen después.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemFila
              key={item.id}
              item={item}
              borrador={borradores[item.id]}
              onBorrador={(valor) => setBorradores((b) => ({ ...b, [item.id]: valor }))}
              onTilde={(hecho) => actualizar.mutate({ id: item.id, cambios: { hecho } })}
              onRespuesta={(respuesta) => {
                if (respuesta === (item.respuesta ?? '')) return;
                actualizar.mutate({ id: item.id, cambios: { respuesta } });
              }}
              onQuitar={() => quitar.mutate(item.id)}
              guardando={actualizar.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ItemFilaProps {
  item: ItemChecklistOrden;
  borrador: string | undefined;
  onBorrador: (valor: string) => void;
  onTilde: (hecho: boolean) => void;
  onRespuesta: (respuesta: string) => void;
  onQuitar: () => void;
  guardando: boolean;
}

function ItemFila({ item, borrador, onBorrador, onTilde, onRespuesta, onQuitar, guardando }: ItemFilaProps) {
  const completo = item.tipo === 'tilde' ? item.hecho : (item.respuesta ?? '') !== '';
  const valor = borrador ?? item.respuesta ?? '';

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {item.tipo === 'tilde' ? (
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300 dark:border-slate-600"
            checked={item.hecho}
            disabled={guardando}
            onChange={(e) => onTilde(e.target.checked)}
          />
        ) : (
          <span
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${completo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500'}`}
          />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm ${completo ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-medium'}`}
          >
            {item.texto}
            {item.obligatorio && !completo && (
              <Badge variant="warning" className="ml-2">
                Obligatorio
              </Badge>
            )}
          </p>

          {item.tipo !== 'tilde' && (
            <input
              className="input py-1 text-sm mt-1.5"
              type={item.tipo === 'numero' ? 'number' : 'text'}
              placeholder={item.tipo === 'numero' ? 'Sin responder' : 'Sin responder'}
              value={valor}
              onChange={(e) => onBorrador(e.target.value)}
              onBlur={(e) => onRespuesta(e.target.value.trim())}
            />
          )}

          {item.completado_en && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date(item.completado_en).toLocaleString('es-AR')}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        title="Quitar el ítem de esta orden"
        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
        onClick={onQuitar}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
