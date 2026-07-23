import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ConnectingState } from '@/shared/components/ui/NotConnectedState';
import { crewStatusLabels } from '@/shared/constants/crewStatus';
import type { Crew } from '@/types';

export default function CrewsPage() {
  const [, setFilters] = useState<{ status?: Crew['status']; zone?: string }>({});
  const [, setSearch] = useState('');

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

      <div className="card">
        <ConnectingState />
      </div>
    </div>
  );
}
