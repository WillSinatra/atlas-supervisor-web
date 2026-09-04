import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useLiberarTicket } from '../hooks/useLiberarTicket';

interface LiberarTicketModalProps {
  open: boolean;
  ticketId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const MOTIVOS = [
  { value: 'equivocacion', label: 'Equivocación' },
  { value: 'sin_acceso', label: 'Sin acceso' },
  { value: 'falta_info', label: 'Falta información' },
  { value: 'no_puedo', label: 'No puedo resolverlo' },
  { value: 'otro', label: 'Otro' },
];

export function LiberarTicketModal({ open, ticketId, onClose, onSuccess }: LiberarTicketModalProps) {
  const [motivo, setMotivo] = useState('equivocacion');
  const [justificacion, setJustificacion] = useState('');
  const { mutate: liberar, isPending } = useLiberarTicket();

  const handleConfirm = () => {
    if (!justificacion.trim()) {
      alert('Por favor ingresa una justificación');
      return;
    }

    liberar(
      { ticketId, motivo, justificacion },
      {
        onSuccess: () => {
          setMotivo('equivocacion');
          setJustificacion('');
          onClose();
          onSuccess?.();
        },
        onError: (error: any) => {
          alert(`Error: ${error.message}`);
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Liberar ticket" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Motivo de liberación
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
          >
            {MOTIVOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Justificación (obligatoria)
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explica por qué liberas este ticket..."
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-atlas-500"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={isPending}>
            Liberar ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
}
