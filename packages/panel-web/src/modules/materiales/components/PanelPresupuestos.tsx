import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Calculator, Pencil, Plus, Printer, Search, Truck, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { presupuestosApi } from '@/shared/services/materiales';
import { moneda } from '@/shared/utils/moneda';
import { PresupuestoModal } from '@/modules/materiales/components/PresupuestoModal';
import type { EstadoPresupuesto, Presupuesto } from '@/types/atlas';

const etiquetasEstado: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  despachado: 'Despachado',
  anulado: 'Anulado',
};

const variantEstado: Record<EstadoPresupuesto, 'neutral' | 'success' | 'danger'> = {
  borrador: 'neutral',
  despachado: 'success',
  anulado: 'danger',
};

/**
 * Presupuestos: cotizaciones con precio que no mueven stock hasta que se
 * despachan. Despachar es la acción que hace efectiva la salida del depósito.
 */
export function PanelPresupuestos() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<string | null>(null);
  const [aDespachar, setADespachar] = useState<Presupuesto | null>(null);
  const [aAnular, setAAnular] = useState<Presupuesto | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['presupuestos', estado, busqueda],
    queryFn: () =>
      presupuestosApi.listar({
        estado: estado || undefined,
        q: busqueda.trim() || undefined,
        per_page: 100,
      }),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
    queryClient.invalidateQueries({ queryKey: ['materiales'] });
  };

  const despachar = useMutation({
    mutationFn: (id: string) => presupuestosApi.despachar(id),
    onSuccess: () => {
      invalidar();
      setADespachar(null);
    },
  });

  const anular = useMutation({
    mutationFn: (id: string) => presupuestosApi.anular(id),
    onSuccess: () => {
      invalidar();
      setAAnular(null);
    },
  });

  const presupuestos = data?.data ?? [];

  const abrirNuevo = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cotizaciones con precio. No mueven stock: el material sale del depósito recién al despachar.
        </p>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNuevo} className="flex-shrink-0">
          Nuevo presupuesto
        </Button>
      </div>

      <PresupuestoModal
        open={modalAbierto}
        presupuestoId={enEdicion}
        onClose={() => setModalAbierto(false)}
        onGuardado={() => {
          invalidar();
          setModalAbierto(false);
        }}
      />

      <Modal
        open={!!aDespachar}
        onClose={() => {
          setADespachar(null);
          despachar.reset();
        }}
        title="Despachar presupuesto"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Al despachar <strong>{aDespachar?.numero}</strong> el material sale del stock del depósito.
          </p>
          <p className="text-xs text-slate-400">
            Si algún material lleva número de serie, hay que tenerlas cargadas antes de despachar.
          </p>
          {despachar.isError && (
            <Alert variant="error" title="No se pudo despachar">
              {mensajeDeError(despachar.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setADespachar(null);
                despachar.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => aDespachar && despachar.mutate(aDespachar.id)}
              loading={despachar.isPending}
            >
              Despachar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!aAnular}
        onClose={() => {
          setAAnular(null);
          anular.reset();
        }}
        title="Anular presupuesto"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Anular <strong>{aAnular?.numero}</strong>?
            {aAnular?.estado === 'despachado' && ' El material vuelve al stock del depósito.'}
          </p>
          {anular.isError && (
            <Alert variant="error" title="No se pudo anular">
              {mensajeDeError(anular.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAAnular(null);
                anular.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => aAnular && anular.mutate(aAnular.id)}
              loading={anular.isPending}
            >
              Anular
            </Button>
          </div>
        </div>
      </Modal>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Buscar por número, destinatario o documento..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select
            placeholder="Todos los estados"
            options={Object.entries(etiquetasEstado).map(([value, label]) => ({ value, label }))}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          />
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
            title="No se pudieron cargar los presupuestos"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : presupuestos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Calculator className="w-8 h-8" />}
            title="Sin presupuestos"
            description="Armá el primero con los materiales y sus precios."
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nuevo presupuesto
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Destinatario</th>
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map((presupuesto) => (
                  <tr
                    key={presupuesto.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{presupuesto.numero}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(presupuesto.creado_en).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white">{presupuesto.destinatario}</p>
                      {presupuesto.documento && <p className="text-xs text-slate-400">{presupuesto.documento}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {presupuesto.items_count ?? 0} ({presupuesto.unidades ?? 0} u.)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {moneda(presupuesto.total ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={variantEstado[presupuesto.estado]}>
                        {etiquetasEstado[presupuesto.estado]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => window.open(`/presupuestos/${presupuesto.id}/imprimir`, '_blank')}
                          title="Imprimir / guardar PDF"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Printer className="w-4 h-4 text-slate-500" />
                        </button>
                        {presupuesto.estado !== 'anulado' && (
                          <>
                            {presupuesto.estado === 'borrador' && (
                              <button
                                onClick={() => setADespachar(presupuesto)}
                                title="Despachar: descuenta del stock"
                                className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              >
                                <Truck className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEnEdicion(presupuesto.id);
                                setModalAbierto(true);
                              }}
                              title="Editar"
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil className="w-4 h-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => setAAnular(presupuesto)}
                              title="Anular"
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Ban className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            {data?.pagination?.total ?? presupuestos.length} presupuesto
            {(data?.pagination?.total ?? presupuestos.length) === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
