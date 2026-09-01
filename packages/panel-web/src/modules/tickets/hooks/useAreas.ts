import { useQuery } from '@tanstack/react-query';
import api from '@/shared/services/api';
import type { Area } from '@/types/atlas';

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get('/v1/areas');
      return (res.data.data || []) as Area[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
