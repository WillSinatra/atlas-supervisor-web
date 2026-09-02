import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt';
import '../styles/gantt-light.css';

interface GanttTask {
  id: string;
  name: string;
  start: string;      // YYYY-MM-DD
  end: string;        // YYYY-MM-DD
  progress: number;   // 0-100
  dependencies?: string;
  type?: 'task' | 'milestone';
}

interface GanttChartProps {
  tareas: GanttTask[];
  onTaskClick?: (task: any) => void;
}

export function GanttChart({ tareas, onTaskClick }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !tareas.length) return;

    // Limpiar instancia anterior
    if (ganttRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Instanciar Gantt
    ganttRef.current = new Gantt(containerRef.current, tareas, {
      on_click: (task: any) => {
        console.log('Task clicked:', task);
        onTaskClick?.(task);
      },
      on_date_change: (task: any, start: any, end: any) => {
        console.log('Task date changed:', task, start, end);
      },
      on_progress_change: (task: any, progress: any) => {
        console.log('Task progress changed:', task, progress);
      }
    });

  }, [tareas, onTaskClick]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-white rounded-lg border border-gray-200 shadow-sm"
      style={{
        minHeight: '400px',
        height: `${Math.max(400, tareas.length * 50 + 150)}px`
      }}
    />
  );
}
