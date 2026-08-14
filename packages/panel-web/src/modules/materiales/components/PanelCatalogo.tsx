import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, Pencil, Plus, Save, Search, Trash2, Undo2, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { materialesApi } from '@/shared/services/materiales';
import { MaterialModal } from '@/modules/materiales/components/MaterialModal';
import type { Material } from '@/types/atlas';

/**
 * Catálogo del depósito: alta, edición, baja y recuento de stock.
 *
 * El stock se edita directo en la tabla y se guarda todo junto: el pañolero
 * recorre el depósito, corrige las cantidades que estén mal y confirma una vez
 * sola, en lugar de abrir y guardar material por material.
 */
export function PanelCatalogo() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Material | null>(null);
  const [aEliminar, setAEliminar] = useState<Material | null>(null);

  /** Stock editado en la tabla y todavía sin confirmar: id → cantidad. */
  const [recuento, setRecuento] = useState<Record<string, number>>({});

  const { data: categorias } = useQuery({
    queryKey: ['materiales', 'categorias'],
    queryFn: () => materialesApi.categorias(),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['materiales', categoria, soloBajoStock],
    queryFn: () =>
      materialesApi.listar({
        categoria: categoria || undefined,
        bajo_stock: soloBajoStock || undefined,
        per_page: 200,
      }),
  });

  // La búsqueda se resuelve en el cliente para no pegarle a la API en cada tecla.
  const materiales = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.data ?? []).filter(
      (m) =>
        !q ||
        [m.nombre, m.codigo, m.codigo_barras, m.detalle, m.categoria].some((campo) =>
          (campo ?? '').toLowerCase().includes(q),
        ),
    );
  }, [data, busqueda]);

  const guardarRecuento = useMutation({
    mutationFn: () =>
      materialesApi.actualizarStock(
        Object.entries(recuento).map(([material_id, stock_actual]) => ({ material_id, stock_actual })),
      ),
    onSuccess: () => {
      setRecuento({});
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => materialesApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
      setAEliminar(null);
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['materiales'] });
  const cambios = Object.keys(recuento).length;

  const editarStock = (material: Material, valor: string) => {
    const numero = Number(valor);
    setRecuento((prev) => {
      const siguiente = { ...prev };
      // Volver al valor original saca la fila de los cambios pendientes.
      if (valor === '' || Number.isNaN(numero) || numero === material.stock_actual) {
        delete siguiente[material.id];
      } else {
        siguiente[material.id] = numero;
      }
      return siguiente;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inventario del depósito. Corregí las cantidades directo en la tabla y guardá todo junto.
        </p>
        <Button
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEnEdicion(null);
            setModalAbierto(true);
          }}
          className="flex-shrink-0"
        >
          Agregar material
        </Button>
      </div>

      <MaterialModal
        open={modalAbierto}
        material={enEdicion}
        categorias={categorias ?? []}
        onClose={() => setModalAbierto(false)}
        onGuardado={() => {
          invalidar();
          setModalAbierto(false);
        }}
      />

      <Modal
        open={!!aEliminar}
        onClose={() => {
          setAEliminar(null);
          eliminar.reset();
        }}
        title="Eliminar material"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que querés eliminar <strong>{aEliminar?.nombre}</strong>?
          </p>
          <p className="text-xs text-slate-400">
            Si ya tuvo movimientos no se va a poder borrar: en ese caso marcalo como inactivo.
          </p>
          {eliminar.isError && (
            <Alert variant="error" title="No se pudo eliminar">
              {mensajeDeError(eliminar.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAEliminar(null);
                eliminar.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
              loading={eliminar.isPending}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por nombre, código o código de barras..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select
            placeholder="Todas las categorías"
            options={(categorias ?? []).map((c) => ({ value: c, label: c }))}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <label className="flex items-center gap-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => setSoloBajoStock(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Solo bajo mínimo</span>
          </label>
        </div>
      </div>

      {guardarRecuento.isError && (
        <Alert variant="error" title="No se pudo guardar el recuento">
          {mensajeDeError(guardarRecuento.error)}
        </Alert>
      )}

      {cambios > 0 && (
        <div className="sticky top-[--topbar-height] z-20 flex flex-wrap items-center justify-between gap-3 card p-3 border-atlas-500">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {cambios} material{cambios === 1 ? '' : 'es'} con el stock cambiado, sin guardar.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Undo2 className="w-4 h-4" />} onClick={() => setRecuento({})}>
              Descartar
            </Button>
            <Button
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={guardarRecuento.isPending}
              onClick={() => guardarRecuento.mutate()}
            >
              Guardar recuento
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudo cargar el catálogo"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : materiales.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="Sin materiales"
            description="No hay materiales que coincidan con los filtros aplicados."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 w-32">Stock</th>
                  <th className="px-4 py-3">Mínimo</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((material) => {
                  const editado = recuento[material.id];
                  return (
                    <tr
                      key={material.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{material.nombre}</p>
                        <p className="text-xs text-slate-400">
                          {[material.codigo, material.codigo_barras, material.detalle]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{material.categoria || '—'}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className={`input py-1 text-sm ${editado !== undefined ? 'border-atlas-500 bg-atlas-50 dark:bg-atlas-900/20' : ''}`}
                          value={editado ?? material.stock_actual}
                          onChange={(e) => editarStock(material, e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          {material.stock_minimo || '—'}
                          {material.bajo_stock && (
                            <span title="En el mínimo o por debajo">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{material.unidad}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={material.activo ? 'success' : 'neutral'}>
                            {material.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {material.requiere_serie && <Badge variant="info">Con serie</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEnEdicion(material);
                              setModalAbierto(true);
                            }}
                            title="Editar"
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => setAEliminar(material)}
                            title="Eliminar"
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            {data?.pagination && data.pagination.total > materiales.length
              ? `${materiales.length} de ${data.pagination.total} materiales`
              : `${materiales.length} material${materiales.length === 1 ? '' : 'es'}`}
          </div>
        </div>
      )}
    </div>
  );
}
