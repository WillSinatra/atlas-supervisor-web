import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, MapPin, Search, Plus, WifiOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Alert } from '@/shared/components/ui/Alert';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { cuadrillasApi, mensajeDeError } from '@/shared/services/api';
import type { Cuadrilla, EstadoCuadrilla } from '@/types/atlas';

const etiquetasEstadoCuadrilla: Record<EstadoCuadrilla, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  fuera_de_servicio: 'Fuera de servicio',
};

const variantEstadoCuadrilla: Record<EstadoCuadrilla, 'success' | 'warning' | 'danger'> = {
  disponible: 'success',
  ocupada: 'warning',
  fuera_de_servicio: 'danger',
};

export default function CrewsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCuadrilla | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cuadrillas', estadoFiltro],
    queryFn: () => cuadrillasApi.listar(estadoFiltro ? { estado: estadoFiltro } : undefined),
  });

  const cuadrillas = (data?.data ?? []).filter((c) =>
    busqueda
      ? c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cuadrillas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione y monitoree cuadrillas y técnicos
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalAbierto(true)} className="self-start sm:self-auto">
          Agregar cuadrilla
        </Button>
      </div>

      <AddCrewModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['cuadrillas'] })}
      />

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Buscar por nombre o código..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select
            placeholder="Todos los estados"
            options={Object.entries(etiquetasEstadoCuadrilla).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setEstadoFiltro((e.target.value || '') as EstadoCuadrilla | '')}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : isError ? (
        <div className="card">
          <EmptyState
            icon={<WifiOff className="w-8 h-8" />}
            title="No se pudieron cargar las cuadrillas"
            description={mensajeDeError(error)}
          />
        </div>
      ) : cuadrillas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Sin cuadrillas"
            description="No hay cuadrillas que coincidan con los filtros aplicados."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuadrillas.map((crew) => (
            <CrewCard key={crew.id} crew={crew} onClick={() => navigate(`/crews/${crew.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CrewCard({ crew, onClick }: { crew: Cuadrilla; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:border-atlas-500 dark:hover:border-atlas-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{crew.nombre}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[crew.codigo, crew.especialidad].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
          </p>
        </div>
        <Badge variant={variantEstadoCuadrilla[crew.estado]}>{etiquetasEstadoCuadrilla[crew.estado]}</Badge>
      </div>

      {crew.zona && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{crew.zona}</span>
        </div>
      )}
    </div>
  );
}

interface AddCrewModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function AddCrewModal({ open, onClose, onCreated }: AddCrewModalProps) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [zona, setZona] = useState('');

  const crear = useMutation({
    mutationFn: () => cuadrillasApi.crear({ nombre, codigo, especialidad, zona }),
    onSuccess: () => {
      onCreated();
      cerrarYResetear();
    },
  });

  const cerrarYResetear = () => {
    setNombre('');
    setCodigo('');
    setEspecialidad('');
    setZona('');
    crear.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={cerrarYResetear} title="Agregar cuadrilla" size="sm">
      <div className="space-y-4">
        {crear.isError && (
          <Alert variant="error" title="No se pudo crear la cuadrilla">
            {mensajeDeError(crear.error)}
          </Alert>
        )}
        <Input label="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <Input label="Especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
        <Input label="Zona" value={zona} onChange={(e) => setZona(e.target.value)} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={cerrarYResetear}>
            Cancelar
          </Button>
          <Button onClick={() => crear.mutate()} loading={crear.isPending} disabled={nombre.trim() === ''}>
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  );
}
