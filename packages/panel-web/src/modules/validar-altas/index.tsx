import React from 'react';
import ValidarAltasContainer from './ValidarAltasContainer';

export default function ValidarAltasPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Validar Altas Rápidas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Revisa y valida los comprobantes de pago. Una vez validadas, se envían a Soporte para crear OT.
        </p>
        <ValidarAltasContainer />
      </div>
    </div>
  );
}
