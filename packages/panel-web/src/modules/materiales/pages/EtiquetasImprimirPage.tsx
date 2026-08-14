import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { CodigoBarras } from '@/shared/components/CodigoBarras';
import { mensajeDeError } from '@/shared/services/api';
import { materialesApi } from '@/shared/services/materiales';

/**
 * Cuántas etiquetas entran por fila. Lo que le importa al lector es el ancho
 * impreso de la barra más finita: con 3 por fila en A4 queda cerca de 0,3 mm,
 * que está por encima del mínimo. Por eso no se ofrece nada más chico.
 */
const TAMANOS = {
  chica: { columnas: 3, altoBarras: 28 },
  mediana: { columnas: 2, altoBarras: 38 },
  grande: { columnas: 1, altoBarras: 55 },
} as const;

type Tamano = keyof typeof TAMANOS;

/**
 * Hoja de etiquetas para el pañol. Se abre en una pestaña aparte, fuera del
 * layout del panel, y abre el diálogo de impresión sola: desde ahí va al papel
 * o a un PDF, sin necesidad de ninguna librería.
 *
 * Los materiales llegan por la URL (?ids=...) para que la hoja se pueda volver
 * a imprimir con solo guardar el enlace.
 */
export default function EtiquetasImprimirPage() {
  const [params] = useSearchParams();

  const ids = useMemo(
    () => (params.get('ids') ?? '').split(',').filter(Boolean),
    [params],
  );
  const tamano: Tamano = (['chica', 'mediana', 'grande'] as const).includes(params.get('tamano') as Tamano)
    ? (params.get('tamano') as Tamano)
    : 'chica';
  const copias = Math.min(Math.max(Number(params.get('copias') ?? 1) || 1, 1), 20);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['materiales', 'para-etiquetas'],
    queryFn: () => materialesApi.listar({ per_page: 200 }),
  });

  // Se respeta el orden en que vienen los ids: es el de la pantalla anterior.
  const materiales = useMemo(() => {
    const porId = new Map((data?.data ?? []).map((m) => [m.id, m]));
    return ids.map((id) => porId.get(id)).filter((m) => m !== undefined);
  }, [data, ids]);

  const conCodigo = materiales.filter((m) => !!m.codigo_barras);
  const sinCodigo = materiales.length - conCodigo.length;

  useEffect(() => {
    if (conCodigo.length === 0) return;
    // Un respiro para que termine de pintar antes de abrir el diálogo.
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [conCodigo.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <EmptyState title="No se pudo cargar el catálogo" description={mensajeDeError(error)} />
      </div>
    );
  }

  if (conCodigo.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <EmptyState
          title="No hay nada para imprimir"
          description="Ninguno de los materiales elegidos tiene código de barras. Generalos primero desde Materiales → Etiquetas."
        />
      </div>
    );
  }

  const { columnas, altoBarras } = TAMANOS[tamano];
  // Cada etiqueta repetida tantas veces como copias se hayan pedido: sirve para
  // los materiales de los que hay muchas unidades en el estante.
  const aImprimir = conCodigo.flatMap((material) =>
    Array.from({ length: copias }, (_, i) => ({ material, clave: `${material.id}-${i}` })),
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 print:p-0">
      <style>{`@page { margin: 8mm; }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <p className="text-sm text-slate-600">
          {aImprimir.length} etiqueta{aImprimir.length === 1 ? '' : 's'}
          {sinCodigo > 0 && ` · ${sinCodigo} material(es) sin código quedaron afuera`}
        </p>
        <Button size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {aImprimir.map(({ material, clave }) => (
          <div
            key={clave}
            className="border border-slate-300 rounded p-2 flex flex-col justify-between"
            style={{ breakInside: 'avoid' }}
          >
            <div className="mb-1">
              <p className="text-[11px] font-semibold leading-tight line-clamp-2">{material.nombre}</p>
              <p className="text-[9px] text-slate-500 leading-tight">
                {[material.codigo, material.categoria].filter(Boolean).join(' · ') || ' '}
              </p>
            </div>
            <CodigoBarras valor={material.codigo_barras!} alto={altoBarras} />
          </div>
        ))}
      </div>
    </div>
  );
}
