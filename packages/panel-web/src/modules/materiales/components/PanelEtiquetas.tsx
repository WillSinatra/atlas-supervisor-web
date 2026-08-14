import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Barcode, Package, Printer, Search, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { CodigoBarras } from '@/shared/components/CodigoBarras';
import { mensajeDeError } from '@/shared/services/api';
import { materialesApi } from '@/shared/services/materiales';
import { esCodigoPropio } from '@/shared/utils/codigoBarras';
import type { Material } from '@/types/atlas';

const TAMANOS = [
  { value: 'chica', label: 'Chica — 3 por fila' },
  { value: 'mediana', label: 'Mediana — 2 por fila' },
  { value: 'grande', label: 'Grande — 1 por fila' },
];

/**
 * Códigos de barras y etiquetas del pañol.
 *
 * Dos cosas que van juntas: generarle un código propio a lo que no tiene
 * (lo que se compra suelto o a granel nunca viene etiquetado) e imprimir la
 * tanda de etiquetas para pegar en el estante. Con eso el pañolero escanea en
 * vez de buscar el material en una lista.
 */
export function PanelEtiquetas() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [soloSinCodigo, setSoloSinCodigo] = useState(false);
  const [tamano, setTamano] = useState('chica');
  const [copias, setCopias] = useState('1');
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());

  const { data: categorias } = useQuery({
    queryKey: ['materiales', 'categorias'],
    queryFn: () => materialesApi.categorias(),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['materiales', 'etiquetas', categoria],
    queryFn: () => materialesApi.listar({ categoria: categoria || undefined, per_page: 200 }),
  });

  // La búsqueda se resuelve acá para no pegarle a la API en cada tecla.
  const materiales = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.data ?? []).filter((m) => {
      if (soloSinCodigo && m.codigo_barras) return false;
      if (!q) return true;
      return [m.nombre, m.codigo, m.codigo_barras, m.categoria].some((campo) =>
        (campo ?? '').toLowerCase().includes(q),
      );
    });
  }, [data, busqueda, soloSinCodigo]);

  const seleccionados = materiales.filter((m) => elegidos.has(m.id));
  const seleccionadosSinCodigo = seleccionados.filter((m) => !m.codigo_barras);
  const totalSinCodigo = (data?.data ?? []).filter((m) => !m.codigo_barras).length;

  const generar = useMutation({
    mutationFn: (ids?: string[]) => materialesApi.generarCodigosFaltantes(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiales'] }),
  });

  const alternar = (id: string) =>
    setElegidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const todosVisiblesElegidos = materiales.length > 0 && materiales.every((m) => elegidos.has(m.id));

  const alternarTodos = () =>
    setElegidos((prev) => {
      const siguiente = new Set(prev);
      if (todosVisiblesElegidos) materiales.forEach((m) => siguiente.delete(m.id));
      else materiales.forEach((m) => siguiente.add(m.id));
      return siguiente;
    });

  const imprimir = () => {
    const conCodigo = seleccionados.filter((m) => m.codigo_barras).map((m) => m.id);
    if (conCodigo.length === 0) return;
    const url = `/materiales/etiquetas?ids=${conCodigo.join(',')}&tamano=${tamano}&copias=${copias}`;
    window.open(url, '_blank', 'noopener');
  };

  const listosParaImprimir = seleccionados.filter((m) => !!m.codigo_barras).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Generá el código de lo que no tiene e imprimí las etiquetas para pegar en el estante. Lo que se
        compra suelto no viene con código de fábrica: este se lo pone Atlas.
      </p>

      {generar.isError && (
        <Alert variant="error" title="No se pudieron generar los códigos">
          {mensajeDeError(generar.error)}
        </Alert>
      )}
      {generar.isSuccess && (
        <Alert variant="success" title="Listo">
          {generar.data.generados === 0
            ? 'No había ninguno sin código.'
            : `Se generaron ${generar.data.generados} código(s) de barras.`}
        </Alert>
      )}

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por nombre, código..."
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
              checked={soloSinCodigo}
              onChange={(e) => setSoloSinCodigo(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Solo los que no tienen código</span>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-700">
          <div className="w-44">
            <Select
              label="Tamaño de etiqueta"
              options={TAMANOS}
              value={tamano}
              onChange={(e) => setTamano(e.target.value)}
            />
          </div>
          <div className="w-28">
            <Input
              label="Copias c/u"
              type="number"
              min={1}
              max={20}
              value={copias}
              onChange={(e) => setCopias(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={<Barcode className="w-4 h-4" />}
              loading={generar.isPending}
              disabled={totalSinCodigo === 0 && seleccionadosSinCodigo.length === 0}
              onClick={() =>
                generar.mutate(
                  // Con una selección hecha se generan solo esos; sin nada
                  // seleccionado, todos los que falten.
                  seleccionadosSinCodigo.length > 0
                    ? seleccionadosSinCodigo.map((m) => m.id)
                    : undefined,
                )
              }
            >
              {seleccionadosSinCodigo.length > 0
                ? `Generar ${seleccionadosSinCodigo.length} código(s)`
                : `Generar los ${totalSinCodigo} que faltan`}
            </Button>
            <Button
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              disabled={listosParaImprimir === 0}
              onClick={imprimir}
            >
              Imprimir {listosParaImprimir > 0 ? `(${listosParaImprimir})` : ''}
            </Button>
          </div>
        </div>
      </div>

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
            description={
              soloSinCodigo
                ? 'Todos los materiales del filtro ya tienen código de barras.'
                : 'No hay materiales que coincidan con los filtros aplicados.'
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todosVisiblesElegidos}
                      onChange={alternarTodos}
                      title="Seleccionar todo lo que se ve"
                    />
                  </th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Código de barras</th>
                  <th className="px-4 py-3 w-56">Etiqueta</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((material: Material) => (
                  <tr
                    key={material.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={elegidos.has(material.id)}
                        onChange={() => alternar(material.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{material.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {[material.codigo, material.categoria].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {material.codigo_barras ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {material.codigo_barras}
                          </span>
                          {esCodigoPropio(material.codigo_barras) && (
                            <Badge variant="neutral">Generado</Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning">Sin código</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {material.codigo_barras ? (
                        <div className="w-52">
                          <CodigoBarras valor={material.codigo_barras} alto={26} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            {materiales.length} material{materiales.length === 1 ? '' : 'es'} · {seleccionados.length}{' '}
            seleccionado{seleccionados.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
