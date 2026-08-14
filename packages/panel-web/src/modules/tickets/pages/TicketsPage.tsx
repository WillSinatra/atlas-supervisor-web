import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, Search, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { cuadrillasApi, ticketsBetaApi, mensajeDeError } from '@/shared/services/api';
import { tipoOrdenLabels } from '@/shared/constants/ordenLabels';
import { etiquetasPrioridad } from '@/types/atlas';
import type { TicketBeta } from '@/types/atlas';
import { CreateTicketModal } from '@/modules/orders/components/CreateTicketModal';

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
}

const sinFiltros: Filtros = {
  q: '',
  estado: '',
  cuadrilla_id: '',
  tipo: '',
  prioridad: '',
  desde: '',
  hasta: '',
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState<Filtros>(sinFiltros);
  const [aplicados, setAplicados] = useState<Filtros>(sinFiltros);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<TicketBeta | null>(null);

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
    queryKey: ['tickets', aplicados],
    queryFn: () => {
      // Los filtros los resuelve la API: el listado puede crecer y filtrar en
      // el cliente solo esconde lo que ya se trajo.
      const params: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(aplicados)) {
        if (valor.trim() !== '') params[clave] = valor.trim();
      }
      return ticketsBetaApi.listar(params);
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
        <Button variant="primary" icon={<FileText className="w-4 h-4" />} onClick={abrirAlta}>
          Crear ticket
        </Button>
      </div>

      <CreateTicketModal
        open={modalAbierto}
        ticket={enEdicion}
        onClose={() => {
          setModalAbierto(false);
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
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
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cuadrilla</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
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
                    <td className="px-4 py-3">
                      <Badge variant={estadoBadge[ticket.estado] ?? 'neutral'}>
                        {estadoLabel[ticket.estado] ?? ticket.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(ticket.creado_en).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEnEdicion(ticket);
                            setModalAbierto(true);
                          }}
                          title="Editar ticket"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() =>
                            navigate('/orders/nueva', {
                              state: {
                                desdeTicket: {
                                  tipo: ticket.tipo,
                                  descripcion: ticket.descripcion ?? '',
                                  clienteNombre: ticket.cliente,
                                  cuadrillaId: ticket.cuadrilla_id ?? undefined,
                                  // Si el ticket quedó ligado al padrón, la orden
                                  // arranca con ese cliente y domicilio ya puestos.
                                  clienteId: ticket.cliente_id ?? undefined,
                                  domicilioId: ticket.domicilio_id ?? undefined,
                                  // Y si no lo está, con esto Nueva Orden lo busca
                                  // sola y ofrece darlo de alta con estos datos.
                                  clienteTelefono: ticket.cliente_telefono ?? undefined,
                                  direccion: ticket.direccion ?? undefined,
                                  falla: ticket.motivo ?? undefined,
                                  ticketBetaId: ticket.id,
                                },
                              },
                            })
                          }
                          className="text-xs font-medium text-atlas-600 dark:text-atlas-400 hover:underline whitespace-nowrap"
                        >
                          Convertir en OT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              {tickets.length} de {data.pagination.total} ticket{data.pagination.total === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
