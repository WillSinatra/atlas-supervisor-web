import { Unplug, Construction } from 'lucide-react';
import { EmptyState } from './EmptyState';

/**
 * Estado final (no un loader) para pantallas que ya tienen endpoint real
 * elegido pero todavía no están conectadas.
 */
export function ConnectingState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={<Unplug className="w-8 h-8" />}
      title="Conectando con el sistema real"
      description="Disponible en breve."
      className={className}
    />
  );
}

/**
 * Estado final para funcionalidades sin backend todavía (no es cuestión de
 * conectar, hay que construirlo).
 */
export function ComingSoonState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={<Construction className="w-8 h-8" />}
      title="Próximamente"
      description="Funcionalidad en desarrollo."
      className={className}
    />
  );
}
