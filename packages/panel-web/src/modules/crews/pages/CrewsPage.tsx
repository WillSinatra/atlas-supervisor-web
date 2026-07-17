import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Truck, MapPin, Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getCrews, type CrewsFilters } from '@/shared/services/crewsService';
import { crewStatusLabels, crewStatusBadgeVariant } from '@/shared/constants/crewStatus';
import type { Crew } from '@/types';

export default function CrewsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CrewsFilters>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crews', filters],
    queryFn: () => getCrews(filters),
  });

  const crews = (data?.data ?? []).filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cuadrillas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestione y monitoree cuadrillas y técnicos
        </p>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Buscar por nombre o código..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Todos los estados"
            options={Object.entries(crewStatusLabels).map(([value, label]) => ({ value, label }))}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: (e.target.value || undefined) as Crew['status'] }))}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
        </div>
      ) : crews.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="w-8 h-8" />} title="Sin cuadrillas" description="No hay cuadrillas que coincidan con los filtros aplicados." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crews.map((crew) => (
            <div
              key={crew.id}
              onClick={() => navigate(`/crews/${crew.id}`)}
              className="card p-5 cursor-pointer hover:border-atlas-500 dark:hover:border-atlas-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{crew.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{crew.code} · {crew.specialty}</p>
                </div>
                <Badge variant={crewStatusBadgeVariant[crew.status]}>{crewStatusLabels[crew.status]}</Badge>
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{crew.technicians.length} técnico{crew.technicians.length === 1 ? '' : 's'}</span>
                </div>
                {crew.vehicle && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span>{crew.vehicle.brand} {crew.vehicle.model} · {crew.vehicle.plate}</span>
                  </div>
                )}
                {crew.zone && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{crew.zone}</span>
                  </div>
                )}
              </div>

              {crew._count && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  {crew._count.workOrders} OT{crew._count.workOrders === 1 ? '' : 's'} activa{crew._count.workOrders === 1 ? '' : 's'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
