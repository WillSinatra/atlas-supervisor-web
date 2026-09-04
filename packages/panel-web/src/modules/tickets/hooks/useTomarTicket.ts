import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/services/api';

export function useTomarTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await api.post(`/v1/tickets-beta/${ticketId}/tomar`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets-beta'] });
    },
  });
}
