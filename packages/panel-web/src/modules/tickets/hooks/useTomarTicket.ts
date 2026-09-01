import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/services/api';

interface TomarResult {
  id: string;
  estado: string;
  tomado_por_id: string;
  tomado_por_nombre: string;
  color_asignado: string;
  tomado_en: string;
}

export function useTomarTicket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string): Promise<TomarResult> => {
      const res = await api.post(`/v1/tickets-beta/${ticketId}/tomar`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets-beta'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Error desconocido';
      const err = new Error(msg);
      throw err;
    },
  });
}
