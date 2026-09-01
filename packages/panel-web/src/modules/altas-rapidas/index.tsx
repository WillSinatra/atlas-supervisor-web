import React from 'react';
import CrearAltaRapida from './CrearAltaRapida';

export default function AltasRapidasPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Alta Rápida</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Crea una nueva alta rápida. El cliente verá el estado en tiempo real.
        </p>
        <CrearAltaRapida />
      </div>
    </div>
  );
}
