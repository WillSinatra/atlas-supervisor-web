import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { ConnectingState } from '@/shared/components/ui/NotConnectedState';

export default function CustomersPage() {
  const [, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestione la información de clientes
        </p>
      </div>

      <div className="card p-4">
        <Input
          placeholder="Buscar por nombre, documento, teléfono o email..."
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <ConnectingState />
      </div>
    </div>
  );
}
