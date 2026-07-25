import { create } from 'zustand';

// Permite que una página de detalle (ej. CrewDetailPage) reemplace el
// segmento dinámico del breadcrumb (un UUID) por una etiqueta legible,
// sin acoplar DashboardLayout a cada módulo.
interface BreadcrumbState {
  labels: Record<string, string>;
  setLabel: (path: string, label: string) => void;
  clearLabel: (path: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (path, label) =>
    set((state) => ({ labels: { ...state.labels, [path]: label } })),
  clearLabel: (path) =>
    set((state) => {
      const { [path]: _omitida, ...resto } = state.labels;
      return { labels: resto };
    }),
}));
