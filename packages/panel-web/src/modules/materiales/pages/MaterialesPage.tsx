import { useState } from 'react';
import { Barcode, Calculator, FileText, Package } from 'lucide-react';
import { Tabs } from '@/shared/components/ui/Tabs';
import { PanelCatalogo } from '@/modules/materiales/components/PanelCatalogo';
import { PanelRemitos } from '@/modules/materiales/components/PanelRemitos';
import { PanelPresupuestos } from '@/modules/materiales/components/PanelPresupuestos';
import { PanelEtiquetas } from '@/modules/materiales/components/PanelEtiquetas';

const pestanas = [
  { id: 'catalogo', label: 'Catálogo', icon: <Package className="w-4 h-4" /> },
  { id: 'etiquetas', label: 'Etiquetas', icon: <Barcode className="w-4 h-4" /> },
  { id: 'remitos', label: 'Remitos', icon: <FileText className="w-4 h-4" /> },
  { id: 'presupuestos', label: 'Presupuestos', icon: <Calculator className="w-4 h-4" /> },
];

export default function MaterialesPage() {
  const [pestana, setPestana] = useState('catalogo');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Materiales</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inventario del depósito y movimientos: lo que entra, lo que sale y a quién.
        </p>
      </div>

      <Tabs tabs={pestanas} activeTab={pestana} onTabChange={setPestana}>
        {(tabId) => {
          if (tabId === 'etiquetas') return <PanelEtiquetas />;
          if (tabId === 'remitos') return <PanelRemitos />;
          if (tabId === 'presupuestos') return <PanelPresupuestos />;
          return <PanelCatalogo />;
        }}
      </Tabs>
    </div>
  );
}
