import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, X, History } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { api, cuadrillasApi, ticketsBetaApi, mensajeDeError } from '@/shared/services/api';
import { tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import { etiquetasPrioridad } from '@/types/atlas';
import type { TicketBeta } from '@/types/atlas';
import { CreateTicketModal } from '@/modules/orders/components/CreateTicketModal';
import { TicketDetailModal } from '@/modules/tickets/TicketDetailModal';

interface TicketEliminado {
  id: string;
  ticket_numero: string;
  ticket_cliente: string;
  ticket_tipo: string;
  eliminado_por_nombre: string;
  razon: string;
  eliminado_en: string;
}

const estadoBadge: Record<string, 'neutral' | 'info' | 'warning'> = {
  nuevo: 'neutral',
  asignada: 'info',
  en_proceso: 'warning',
};

const estadoLabel: Record<string, string> = {
  nuevo: 'Nuevo',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
};

interface Filtros {
  q: string;
  estado: string;
  cuadrilla_id: string;
  tipo: string;
  prioridad: string;
  desde: string;
  hasta: string;
  zona: string;
}

const sinFiltros: Filtros = {
  q: '',
  estado: '',
  cuadrilla_id: '',
  tipo: '',
  prioridad: '',
  desde: '',
  hasta: '',
  zona: '',
};

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState<Filtros>(sinFiltros);
  const [aplicados, setAplicados] = useState<Filtros>(sinFiltros);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<TicketBeta | null>(null);
  const [viendo, setViendo] = useState<TicketBeta | null>(null);
  const [page, setPage] = useState(1);  
// El texto se espera a que dejen de tipear; el resto se aplica al toque.
  useEffect(() => {
    const id = setTimeout(() => setAplicados(filtros), 300);
    return () => clearTimeout(id);
  }, [filtros]);

  const { data: cuadrillasData } = useQuery({
    queryKey: ['cuadrillas'],
    queryFn: () => cuadrillasApi.listar(),
  });
  const nombreCuadrilla = (id: string | null | undefined) =>
    id ? cuadrillasData?.data.find((c) => c.id === id)?.nombre ?? '—' : 'Sin asignar';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets', aplicados, page],
    queryFn: () => {
      // Los filtros los resuelve la API: el listado puede crecer y filtrar en
      // el cliente solo esconde lo que ya se trajo.
      const params: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(aplicados)) {
        if (valor.trim() !== '') params[clave] = valor.trim();
      params.page = page.toString();      
     }
      return ticketsBetaApi.listar(params);
    },
  });

const { data: dataEliminados, isLoading: cargandoEliminados } = useQuery({
  queryKey: ['tickets-eliminados'],
  queryFn: async () => {
    const res = await api.get('/v1/tickets-beta/eliminados/historial');
    return res.data;
  },
});

  const tickets = data?.data ?? [];
  const hayFiltros = Object.values(aplicados).some((v) => v.trim() !== '');

  const setFiltro = <K extends keyof Filtros>(clave: K, valor: Filtros[K]) =>
    setFiltros((prev) => ({ ...prev, [clave]: valor }));

  const abrirAlta = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };


    const eliminados: TicketEliminado[] = dataEliminados?.data || [];
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [viendoEliminado, setViendoEliminado] = useState<TicketEliminado | null>(null);
  useEffect(() => {
    if (activeTab === 'activos') {
      setFiltro('estado', 'nuevo,en_proceso');
    } else {
      setFiltro('estado', 'resuelto,convertido_a_ot');
    }
  }, [activeTab]); 
return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tickets</h1>
            <Badge variant="info">Beta</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Captura rápida de trabajos. Cada uno se puede convertir en orden de trabajo.
          </p>
        </div>
        {activeTab === 'activos' && (
          <Button variant="primary" icon={<FileText className="w-4 h-4" />} onClick={abrirAlta}>
            Crear ticket
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('activos')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'activos'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 border-b-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'historial'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
      </div>

      {activeTab === 'activos' && (
        <>

      <CreateTicketModal
        open={modalAbierto}
        ticket={enEdicion}
        onClose={() => {
          setModalAbierto(false);
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />

      <TicketDetailModal
        ticket={viendo}
        nombreCuadrilla={nombreCuadrilla}
        onClose={() => setViendo(null)}
        onEditar={(ticket) => {
          setViendo(null);
          setEnEdicion(ticket);
          setModalAbierto(true);
        }}
      />

      {/* Todo en una fila en pantallas anchas: son filtros, no un formulario.
          Las fechas van sin etiqueta arriba para que todos los controles tengan
          la misma altura; la aclaración va abajo, en una sola línea. */}
      <div className="card p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-8 gap-2">
          <div className="col-span-2 sm:col-span-3 xl:col-span-2">
            <Input
              placeholder="Buscar cliente o dirección..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              value={filtros.q}
              onChange={(e) => setFiltro('q', e.target.value)}
            />
          </div>
          <Select
            placeholder="Estado"
            options={Object.entries(estadoLabel).map(([value, label]) => ({ value, label }))}
            value={filtros.estado}
            onChange={(e) => setFiltro('estado', e.target.value)}
          />
          <Select
            placeholder="Cuadrilla"
            options={(cuadrillasData?.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
            value={filtros.cuadrilla_id}
            onChange={(e) => setFiltro('cuadrilla_id', e.target.value)}
          />
          <Select
            placeholder="Tipo"
            options={Object.entries(tipoOrdenLabels).map(([value, label]) => ({ value, label }))}
            value={filtros.tipo}
            onChange={(e) => setFiltro('tipo', e.target.value)}
          />
          <Select
            placeholder="Prioridad"
            options={Object.entries(etiquetasPrioridad).map(([value, label]) => ({ value, label }))}
            value={filtros.prioridad}
            onChange={(e) => setFiltro('prioridad', e.target.value)}
          />
          <Input
            type="date"
            title="Desde"
            value={filtros.desde}
            onChange={(e) => setFiltro('desde', e.target.value)}
          />
          <Input
            type="date"
            title="Hasta"
            value={filtros.hasta}
            onChange={(e) => setFiltro('hasta', e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 mt-2">
          <p className="text-xs text-slate-400">Las fechas filtran por día de carga, ambas inclusive.</p>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setFiltros(sinFiltros)}
              className="text-xs font-medium text-atlas-600 dark:text-atlas-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No se pudieron cargar los tickets"
            description={mensajeDeError(error)}
            action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
          />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title={hayFiltros ? 'Sin resultados' : 'No hay tickets registrados'}
            description={
              hayFiltros
                ? 'Ningún ticket coincide con los filtros aplicados.'
                : 'Creá el primero con el botón de arriba.'
            }
            action={
              hayFiltros ? (
                <Button variant="secondary" onClick={() => setFiltros(sinFiltros)}>
                  Limpiar filtros
                </Button>
              ) : undefined
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
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">Zona</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setViendo(ticket)}
                    className="cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-atlas-600 dark:text-atlas-400 uppercase text-xs">
                      {ticket.numero || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {ticket.cliente || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {ticket.direccion || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {tipoOrdenLabels[ticket.tipo as keyof typeof tipoOrdenLabels] ?? ticket.tipo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {nombreCuadrilla(ticket.cuadrilla_id)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {ticket.zona || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={estadoBadge[ticket.estado] ?? 'neutral'}>
                        {estadoLabel[ticket.estado] ?? ticket.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(ticket.creado_en).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tickets.length} de {data.pagination.total} ticket{data.pagination.total === 1 ? '' : 's'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Página {page} de {data.pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
                  disabled={page === data.pagination.total_pages}
                  className="px-3 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Historial Tab */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          {cargandoEliminados ? (
            <div className="card text-center py-8 text-slate-500">Cargando historial...</div>
          ) : eliminados.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<History className="w-8 h-8" />}
                title="Sin historial"
                description="No hay tickets eliminados aún."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Eliminado Por</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eliminados.map((elim) => (
                      <tr
                        key={elim.id}
                        onClick={() => setViendoEliminado(elim)}
                        className="cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {elim.ticket_cliente}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {tipoOrdenLabels[elim.ticket_tipo as keyof typeof tipoOrdenLabels] ?? elim.ticket_tipo ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {elim.eliminado_por_nombre}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {elim.razon || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(elim.eliminado_en).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
       )}

      {/* Modal Preview Eliminado */}
      {viendoEliminado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-slate-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Ticket Eliminado</h3>
              <button
                onClick={() => setViendoEliminado(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Cliente</p>
                  <p className="text-slate-100 font-medium">{viendoEliminado.ticket_cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Tipo</p>
                  <p className="text-slate-100 font-medium">
                    {tipoOrdenLabels[viendoEliminado.ticket_tipo as keyof typeof tipoOrdenLabels] ?? viendoEliminado.ticket_tipo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Eliminado Por</p>
                  <p className="text-slate-100">{viendoEliminado.eliminado_por_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Fecha</p>
                  <p className="text-slate-100">{new Date(viendoEliminado.eliminado_en).toLocaleDateString('es-AR')}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase">Motivo</p>
                <p className="text-slate-100 bg-slate-800/50 rounded px-3 py-2">
                  {viendoEliminado.razon || '(Sin especificar)'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <button
                  onClick={() => setViendoEliminado(null)}
                  className="w-full px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
