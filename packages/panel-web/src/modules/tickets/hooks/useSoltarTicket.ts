import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/services/api';

export function useSoltarTicket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await api.post(`/v1/tickets-beta/${ticketId}/soltar`);
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
