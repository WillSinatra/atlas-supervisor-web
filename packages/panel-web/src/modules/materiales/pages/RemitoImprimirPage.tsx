import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { remitosApi } from '@/shared/services/materiales';

const etiquetasDestino: Record<string, string> = {
  cuadrilla: 'Cuadrilla',
  empleado: 'Empleado',
  externo: 'Persona externa',
};

/**
 * Remito imprimible. Se abre en una pestaña aparte, fuera del layout del panel,
 * y abre el diálogo de impresión solo: desde ahí se manda al papel o se guarda
 * como PDF, que es lo que hace el navegador sin necesidad de una librería.
 */
export default function RemitoImprimirPage() {
  const { id } = useParams<{ id: string }>();

  const { data: remito, isLoading, isError, error } = useQuery({
    queryKey: ['remito', id],
    queryFn: () => remitosApi.detalle(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!remito) return;
    // Un respiro para que termine de pintar antes de abrir el diálogo.
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [remito]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError || !remito) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <EmptyState title="No se pudo cargar el remito" description={isError ? mensajeDeError(error) : undefined} />
      </div>
    );
  }

  const fecha = new Date(remito.creado_en);
  const unidades = (remito.items ?? []).reduce((suma, i) => suma + i.cantidad, 0);

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
            <h1 className="text-2xl font-bold">Remito de {remito.tipo === 'entrega' ? 'entrega' : 'devolución'}</h1>
            <p className="text-sm text-slate-600 mt-1">Atlas — Control de materiales</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{remito.numero}</p>
            <p className="text-sm text-slate-600">
              {fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {remito.estado === 'anulado' && (
              <p className="mt-1 inline-block px-2 py-0.5 border-2 border-red-600 text-red-600 font-bold text-sm">
                ANULADO
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-slate-500 uppercase text-xs tracking-wide">Destino</p>
            <p className="font-medium">{remito.destino}</p>
            <p className="text-slate-600">{etiquetasDestino[remito.destino_tipo] ?? remito.destino_tipo}</p>
            {remito.persona_documento && <p className="text-slate-600">Doc. {remito.persona_documento}</p>}
          </div>
          <div>
            <p className="text-slate-500 uppercase text-xs tracking-wide">Entregó</p>
            <p className="font-medium">{remito.usuario_nombre ?? '—'}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-y border-slate-300 text-left">
              <th className="py-2 pr-2">Código</th>
              <th className="py-2 pr-2">Material</th>
              <th className="py-2 pr-2 text-right w-20">Cant.</th>
              <th className="py-2">Unidad</th>
            </tr>
          </thead>
          <tbody>
            {(remito.items ?? []).map((item) => (
              <tr key={item.id ?? item.material_id} className="border-b border-slate-200 align-top">
                <td className="py-2 pr-2 text-slate-600">{item.codigo ?? '—'}</td>
                <td className="py-2 pr-2">
                  {item.nombre}
                  {item.series && item.series.length > 0 && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      Series: {item.series.join(' · ')}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-2 text-right font-medium">{item.cantidad}</td>
                <td className="py-2 text-slate-600">{item.unidad ?? ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800">
              <td colSpan={2} className="py-2 font-medium">
                Total
              </td>
              <td className="py-2 text-right font-bold">{unidades}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        {remito.observaciones && (
          <div className="mb-8 text-sm">
            <p className="text-slate-500 uppercase text-xs tracking-wide">Observaciones</p>
            <p>{remito.observaciones}</p>
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
