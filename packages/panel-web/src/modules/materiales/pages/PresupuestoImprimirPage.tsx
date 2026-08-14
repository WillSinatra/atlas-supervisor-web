import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { presupuestosApi } from '@/shared/services/materiales';
import { moneda } from '@/shared/utils/moneda';

/**
 * Presupuesto imprimible. Se abre en una pestaña aparte y dispara el diálogo
 * de impresión: de ahí sale al papel o a PDF.
 */
export default function PresupuestoImprimirPage() {
  const { id } = useParams<{ id: string }>();

  const { data: presupuesto, isLoading, isError, error } = useQuery({
    queryKey: ['presupuesto', id],
    queryFn: () => presupuestosApi.detalle(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!presupuesto) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [presupuesto]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !presupuesto) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <EmptyState
          title="No se pudo cargar el presupuesto"
          description={isError ? mensajeDeError(error) : undefined}
        />
      </div>
    );
  }

  const fecha = new Date(presupuesto.creado_en);

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4 print:hidden">
          <Button size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>

        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Presupuesto</h1>
            <p className="text-sm text-slate-600 mt-1">Atlas — Materiales</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{presupuesto.numero}</p>
            <p className="text-sm text-slate-600">{fecha.toLocaleDateString('es-AR')}</p>
            {presupuesto.estado === 'anulado' && (
              <p className="mt-1 inline-block px-2 py-0.5 border-2 border-red-600 text-red-600 font-bold text-sm">
                ANULADO
              </p>
            )}
            {presupuesto.estado === 'despachado' && (
              <p className="mt-1 text-xs text-slate-600">
                Despachado el{' '}
                {presupuesto.despachado_en
                  ? new Date(presupuesto.despachado_en).toLocaleDateString('es-AR')
                  : '—'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-slate-500 uppercase text-xs tracking-wide">Destinatario</p>
            <p className="font-medium">{presupuesto.destinatario}</p>
            {presupuesto.documento && <p className="text-slate-600">{presupuesto.documento}</p>}
            {presupuesto.contacto && <p className="text-slate-600">{presupuesto.contacto}</p>}
          </div>
          <div>
            <p className="text-slate-500 uppercase text-xs tracking-wide">Preparado por</p>
            <p className="font-medium">{presupuesto.usuario_nombre ?? '—'}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-y border-slate-300 text-left">
              <th className="py-2 pr-2">Código</th>
              <th className="py-2 pr-2">Material</th>
              <th className="py-2 pr-2 text-right w-16">Cant.</th>
              <th className="py-2 pr-2 text-right w-28">Precio</th>
              <th className="py-2 text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(presupuesto.items ?? []).map((item) => (
              <tr key={item.id ?? item.material_id} className="border-b border-slate-200 align-top">
                <td className="py-2 pr-2 text-slate-600">{item.codigo ?? '—'}</td>
                <td className="py-2 pr-2">
                  {item.nombre}
                  {item.series && item.series.length > 0 && (
                    <div className="text-xs text-slate-600 mt-0.5">Series: {item.series.join(' · ')}</div>
                  )}
                </td>
                <td className="py-2 pr-2 text-right">{item.cantidad}</td>
                <td className="py-2 pr-2 text-right">{moneda(item.precio_unitario)}</td>
                <td className="py-2 text-right font-medium">{moneda(item.subtotal ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800">
              <td colSpan={4} className="py-2 text-right font-medium">
                Total
              </td>
              <td className="py-2 text-right text-lg font-bold">{moneda(presupuesto.total ?? 0)}</td>
            </tr>
          </tfoot>
        </table>

        {presupuesto.observaciones && (
          <div className="mb-8 text-sm">
            <p className="text-slate-500 uppercase text-xs tracking-wide">Observaciones</p>
            <p>{presupuesto.observaciones}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-12 mt-16 text-sm">
          <div className="border-t border-slate-400 pt-2 text-center text-slate-600">Firma de quien entrega</div>
          <div className="border-t border-slate-400 pt-2 text-center text-slate-600">
            Firma y aclaración de quien recibe
          </div>
        </div>
      </div>
    </div>
  );
}
