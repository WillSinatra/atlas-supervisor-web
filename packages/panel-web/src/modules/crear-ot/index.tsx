import React from 'react';
import CrearOTContainer from './CrearOTContainer';

export default function CrearOTPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Crear Órdenes de Trabajo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Selecciona altas validadas para crear órdenes de trabajo y asignarlas a cuadrillas.
        </p>
        <CrearOTContainer />
      </div>
    </div>
  );
}
