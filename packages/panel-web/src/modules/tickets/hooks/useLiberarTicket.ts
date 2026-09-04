import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/services/api';

interface LiberarPayload {
  motivo: string;
  justificacion: string;
}

export function useLiberarTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ticketId: string } & LiberarPayload) => {
      const res = await api.post(`/v1/tickets-beta/${payload.ticketId}/liberar`, {
        motivo: payload.motivo,
        justificacion: payload.justificacion,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
    },
  });
}
