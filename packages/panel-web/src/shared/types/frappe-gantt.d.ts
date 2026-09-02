/**
 * frappe-gantt no publica tipos propios (paquete sin `types`/`.d.ts`).
 * Declaración mínima con lo que usa GanttChartSection — ampliar acá si se
 * empiezan a usar más opciones de la librería (ver node_modules/frappe-gantt/src/defaults.js).
 */
declare module 'frappe-gantt' {
  export type GanttViewMode = 'Hour' | 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year';

  export interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface GanttOptions {
    view_mode?: GanttViewMode;
    view_mode_select?: boolean;
    language?: string;
    readonly?: boolean;
    readonly_dates?: boolean;
    readonly_progress?: boolean;
    bar_height?: number;
    bar_corner_radius?: number;
    padding?: number;
    on_click?: (task: GanttTask) => void;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
  }

  export default class Gantt {
    constructor(wrapper: string | HTMLElement | SVGElement, tasks: GanttTask[], options?: GanttOptions);
    refresh(tasks: GanttTask[]): void;
    change_view_mode(mode?: GanttViewMode): void;
    destroy?: () => void;
  }
}
