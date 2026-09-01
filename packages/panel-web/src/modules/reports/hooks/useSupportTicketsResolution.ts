import { useQuery } from '@tanstack/react-query';
import api from '@/shared/services/api';

export interface TicketResolutionStats {
  resuelto_por_id: string;
  resuelto_por_nombre: string;
  tickets_resueltos: number;
  ticket_ids: string[];
}

export function useSupportTicketsResolution(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['tickets-resueltos-por-persona', { dateFrom, dateTo }],
    queryFn: async () => {
      const res = await api.get('/v1/tickets-beta', {
        params: {
          estado: 'resuelto',
          desde: dateFrom,
          hasta: dateTo,
          per_page: 1000,
        },
      });
      
      // Agrupar por quién resolvió
      const grouped = (res.data.data || []).reduce((acc: Record<string, TicketResolutionStats>, ticket: any) => {
        const resolverId = ticket.resuelto_por_id || 'no-registrado';
        const resolverNombre = ticket.resuelto_por_nombre || 'No registrado';
        
        if (!acc[resolverId]) {
          acc[resolverId] = {
            resuelto_por_id: resolverId,
            resuelto_por_nombre: resolverNombre,
            tickets_resueltos: 0,
            ticket_ids: [],
          };
        }
        
        acc[resolverId].tickets_resueltos += 1;
        acc[resolverId].ticket_ids.push(ticket.id);
        
        return acc;
      }, {});
      
      return (Object.values(grouped) as TicketResolutionStats[]).sort((a, b) => b.tickets_resueltos - a.tickets_resueltos);
    },
    staleTime: 1000 * 60 * 5,
  });
}
