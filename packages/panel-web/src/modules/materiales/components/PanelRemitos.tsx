import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, FileText, Pencil, Plus, Printer, Search, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { mensajeDeError } from '@/shared/services/api';
import { remitosApi } from '@/shared/services/materiales';
import { RemitoModal } from '@/modules/materiales/components/RemitoModal';
import type { Remito } from '@/types/atlas';

const etiquetasDestino: Record<string, string> = {
  cuadrilla: 'Cuadrilla',
  empleado: 'Empleado',
  externo: 'Externo',
};

/**
 * Entregas y devoluciones de material. Un remito equivocado se corrige sobre
 * sí mismo (mismo número, stock recalculado); anularlo devuelve todo al lugar
 * de donde salió.
 */
export function PanelRemitos() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [serie, setSerie] = useState('');
  const [tipo, setTipo] = useState('');
  const [destino, setDestino] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<string | null>(null);
  const [aAnular, setAAnular] = useState<Remito | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['remitos', tipo, destino, serie, busqueda],
    queryFn: () =>
      remitosApi.listar({
        tipo: tipo || undefined,
        destino_tipo: destino || undefined,
        serie: serie.trim() || undefined,
        q: busqueda.trim() || undefined,
        per_page: 100,
      }),
  });

  const anular = useMutation({
    mutationFn: (id: string) => remitosApi.anular(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
      setAAnular(null);
    },
  });

  const remitos = data?.data ?? [];

  const abrirNuevo = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Entregas a cuadrillas, empleados o personas externas, y devoluciones al depósito.
        </p>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNuevo} className="flex-shrink-0">
          Nuevo remito
        </Button>
      </div>

      <RemitoModal
        open={modalAbierto}
        remitoId={enEdicion}
        onClose={() => setModalAbierto(false)}
        onGuardado={() => {
          queryClient.invalidateQueries({ queryKey: ['remitos'] });
          queryClient.invalidateQueries({ queryKey: ['materiales'] });
          setModalAbierto(false);
        }}
      />

      <Modal
        open={!!aAnular}
        onClose={() => {
          setAAnular(null);
          anular.reset();
        }}
        title="Anular remito"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Anular el remito <strong>{aAnular?.numero}</strong>? El material vuelve al lugar de donde salió.
          </p>
          <p className="text-xs text-slate-400">
            Si lo que hay es un error de material o cantidad, conviene corregirlo en lugar de anularlo.
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Buscar por número o persona..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Input
            placeholder="Buscar por número de serie..."
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
          />
          <Select
            placeholder="Entregas y devoluciones"
            options={[
              { value: 'entrega', label: 'Entregas' },
              { value: 'devolucion', label: 'Devoluciones' },
            ]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
          <Select
            placeholder="Todos los destinos"
            options={Object.entries(etiquetasDestino).map(([value, label]) => ({ value, label }))}
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
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
            title="No se pudieron cargar los remitos"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : remitos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="Sin remitos"
            description={
              serie.trim()
                ? 'Ningún remito incluye ese número de serie.'
                : 'Todavía no se registraron entregas ni devoluciones.'
            }
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nuevo remito
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
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {remitos.map((remito) => (
                  <tr
                    key={remito.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{remito.numero}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(remito.creado_en).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={remito.tipo === 'entrega' ? 'warning' : 'success'}>
                        {remito.tipo === 'entrega' ? 'Entrega' : 'Devolución'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white">{remito.destino}</p>
                      <p className="text-xs text-slate-400">{etiquetasDestino[remito.destino_tipo]}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {remito.items_count ?? 0} ({remito.unidades ?? 0} u.)
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={remito.estado === 'anulado' ? 'danger' : 'neutral'}>
                        {remito.estado === 'anulado' ? 'Anulado' : 'Confirmado'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => window.open(`/remitos/${remito.id}/imprimir`, '_blank')}
                          title="Imprimir / guardar PDF"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Printer className="w-4 h-4 text-slate-500" />
                        </button>
                        {remito.estado !== 'anulado' && (
                          <>
                            <button
                              onClick={() => {
                                setEnEdicion(remito.id);
                                setModalAbierto(true);
                              }}
                              title="Corregir"
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil className="w-4 h-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => setAAnular(remito)}
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
            {data?.pagination?.total ?? remitos.length} remito
            {(data?.pagination?.total ?? remitos.length) === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
