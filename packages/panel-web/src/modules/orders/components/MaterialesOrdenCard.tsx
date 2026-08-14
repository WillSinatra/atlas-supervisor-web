import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Trash2, X } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { mensajeDeError } from '@/shared/services/api';
import { stockApi } from '@/shared/services/materiales';

interface MaterialesOrdenCardProps {
  ordenId: string;
  /** Sin cuadrilla no hay stock del que descontar. */
  cuadrillaId: string | null;
}

/**
 * Materiales usados en la orden. Lo que se carga acá se descuenta del stock de
 * la cuadrilla que hizo el trabajo — es el mismo endpoint que consume la app
 * del técnico, así que los dos caminos llegan al mismo lugar.
 */
export function MaterialesOrdenCard({ ordenId, cuadrillaId }: MaterialesOrdenCardProps) {
  const queryClient = useQueryClient();
  const [materialId, setMaterialId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [series, setSeries] = useState<string[]>([]);
  const [agregando, setAgregando] = useState(false);

  const { data: consumos } = useQuery({
    queryKey: ['orden-materiales', ordenId],
    queryFn: () => stockApi.materialesDeOrden(ordenId),
  });

  // Solo se puede consumir lo que la cuadrilla tiene arriba del vehículo.
  const { data: stock } = useQuery({
    queryKey: ['stock-cuadrilla', cuadrillaId],
    queryFn: () => stockApi.deCuadrilla(cuadrillaId!),
    enabled: !!cuadrillaId && agregando,
  });

  const elegido = (stock ?? []).find((s) => s.material_id === materialId);

  const limpiar = () => {
    setMaterialId('');
    setCantidad(1);
    setSeries([]);
    setAgregando(false);
  };

  const agregar = useMutation({
    mutationFn: () => stockApi.agregarMaterialAOrden(ordenId, [{ material_id: materialId, cantidad, series }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-materiales', ordenId] });
      queryClient.invalidateQueries({ queryKey: ['stock-cuadrilla', cuadrillaId] });
      limpiar();
    },
  });

  const quitar = useMutation({
    mutationFn: (id: string) => stockApi.quitarMaterialDeOrden(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-materiales', ordenId] });
      queryClient.invalidateQueries({ queryKey: ['stock-cuadrilla', cuadrillaId] });
    },
  });

  const lista = consumos ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-atlas-600" /> Materiales usados
        </h3>
        {!agregando && cuadrillaId && (
          <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAgregando(true)}>
            Agregar
          </Button>
        )}
      </div>

      {!cuadrillaId && (
        <Alert variant="info">
          La orden todavía no tiene cuadrilla asignada. El consumo se descuenta del stock de la cuadrilla, así que
          primero hay que asignarla.
        </Alert>
      )}

      {agregar.isError && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudo registrar el consumo">
            {mensajeDeError(agregar.error)}
          </Alert>
        </div>
      )}
      {quitar.isError && (
        <div className="mb-3">
          <Alert variant="error">{mensajeDeError(quitar.error)}</Alert>
        </div>
      )}

      {agregando && (
        <div className="mb-4 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 space-y-3">
          <Select
            label="Material del stock de la cuadrilla"
            placeholder={(stock ?? []).length === 0 ? 'La cuadrilla no tiene stock cargado' : 'Seleccionar material'}
            options={(stock ?? []).map((s) => ({
              value: s.material_id,
              label: `${s.nombre} — ${s.cantidad} ${s.unidad} disponible${s.cantidad === 1 ? '' : 's'}`,
            }))}
            value={materialId}
            onChange={(e) => {
              setMaterialId(e.target.value);
              setSeries([]);
            }}
          />

          <div className="flex items-end gap-2">
            <div className="w-28">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                max={elegido?.cantidad ?? undefined}
                className="input py-1.5"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={agregar.isPending}
                disabled={!materialId}
                onClick={() => agregar.mutate()}
              >
                Registrar
              </Button>
            </div>
          </div>

          {elegido?.requiere_serie && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                Series ({series.length}/{cantidad}) — escaneá o escribí y Enter
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {series.map((serie) => (
                  <Badge key={serie} variant="info" className="gap-1">
                    {serie}
                    <button type="button" onClick={() => setSeries(series.filter((s) => s !== serie))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {series.length < cantidad && (
                  <input
                    className="input py-1 text-sm w-44"
                    placeholder="Número de serie"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const valor = (e.target as HTMLInputElement).value.trim();
                      if (valor === '' || series.includes(valor)) return;
                      setSeries([...series, valor]);
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no se registraron materiales en esta orden.
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((consumo) => (
            <div
              key={consumo.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {consumo.cantidad} {consumo.unidad} · {consumo.nombre}
                </p>
                {consumo.series.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Series: {consumo.series.join(' · ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => quitar.mutate(consumo.id)}
                disabled={quitar.isPending}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                title="Quitar y devolver al stock de la cuadrilla"
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
