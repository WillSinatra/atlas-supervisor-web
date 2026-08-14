import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Pencil, Phone, Plus, Search, Trash2, UserPlus, Users, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { clientesApi, mensajeDeError } from '@/shared/services/api';
import { useAuth } from '@/shared/contexts/AuthContext';
import { ClienteModal } from '@/modules/customers/components/ClienteModal';
import type { Cliente } from '@/types/atlas';

/** Los mismos roles que acepta la API para escribir clientes. */
const ROLES_ABM = ['admin', 'planificador', 'despachador', 'operador'];

const POR_PAGINA = 50;

export default function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Cliente | null>(null);
  const [aEliminar, setAEliminar] = useState<Cliente | null>(null);

  const puedeEditar = ROLES_ABM.includes(user?.rol ?? '');

  // La búsqueda la resuelve la API (el padrón de clientes puede ser grande), así
  // que se espera a que la persona deje de tipear antes de pedirla.
  useEffect(() => {
    const id = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(id);
  }, [busqueda]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clientes', busquedaAplicada, pagina],
    queryFn: () =>
      clientesApi.listar({ q: busquedaAplicada || undefined, page: pagina, per_page: POR_PAGINA }),
  });

  const clientes = data?.data ?? [];
  const paginacion = data?.pagination;

  const eliminar = useMutation({
    mutationFn: (id: string) => clientesApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setAEliminar(null);
    },
  });

  const abrirAlta = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (cliente: Cliente) => {
    setEnEdicion(cliente);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quiénes reciben el servicio. Cada orden de trabajo se hace sobre un cliente y uno de sus domicilios.
          </p>
        </div>
        {puedeEditar && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={abrirAlta} className="self-start sm:self-auto">
            Nuevo cliente
          </Button>
        )}
      </div>

      <ClienteModal
        open={modalAbierto}
        cliente={enEdicion}
        onClose={() => setModalAbierto(false)}
        onGuardado={(cliente) => {
          queryClient.invalidateQueries({ queryKey: ['clientes'] });
          setModalAbierto(false);
          // Recién creado: se abre la ficha para cargarle domicilios.
          if (!enEdicion) navigate(`/customers/${cliente.id}`);
        }}
      />

      <Modal
        open={!!aEliminar}
        onClose={() => {
          setAEliminar(null);
          eliminar.reset();
        }}
        title="Eliminar cliente"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que querés eliminar a <strong>{aEliminar?.nombre}</strong>? Se van también sus domicilios.
            Esta acción no se puede deshacer.
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
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudieron cargar los clientes"
            description={mensajeDeError(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : clientes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={busquedaAplicada ? <Search className="w-8 h-8" /> : <Users className="w-8 h-8" />}
            title={busquedaAplicada ? 'Sin resultados' : 'Todavía no hay clientes'}
            description={
              busquedaAplicada
                ? 'No hay clientes que coincidan con la búsqueda.'
                : 'Cargá el primero para poder emitir órdenes de trabajo.'
            }
            action={
              puedeEditar && !busquedaAplicada ? (
                <Button variant="secondary" icon={<UserPlus className="w-4 h-4" />} onClick={abrirAlta}>
                  Nuevo cliente
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
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Email</th>
                  {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/customers/${cliente.id}`)}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {cliente.telefono ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {cliente.telefono}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {cliente.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {cliente.email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {puedeEditar && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirEdicion(cliente);
                            }}
                            title="Editar"
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAEliminar(cliente);
                            }}
                            title="Eliminar"
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {paginacion
                ? `${clientes.length} de ${paginacion.total} cliente${paginacion.total === 1 ? '' : 's'}`
                : `${clientes.length} clientes`}
            </span>
            {paginacion && paginacion.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {paginacion.page} / {paginacion.total_pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagina >= paginacion.total_pages}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
