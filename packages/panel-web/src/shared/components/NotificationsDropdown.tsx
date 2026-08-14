import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { notificacionesApi } from '@/shared/services/tareas';
import type { Notificacion, TipoNotificacion } from '@/types/atlas';

const colorPorTipo: Record<TipoNotificacion, string> = {
  error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
};

/** "Hace 5m", "Hace 2h"… Para algo que pasó recién, la hora exacta no aporta. */
function haceCuanto(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos}m`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias}d`;
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function NotificationsDropdown() {
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // El globito se refresca solo: es la única forma de enterarse de que llegó
  // algo sin recargar la página (no hay websocket para esto todavía).
  //
  // staleTime en 0 a propósito, pisando el default global de 5 minutos: un
  // conteo de notificaciones viejo de minutos no sirve para nada, y sobre todo
  // no puede quedar cacheado de una sesión a la otra.
  const { data: sinLeer = 0 } = useQuery({
    queryKey: ['notificaciones', 'sin-leer'],
    queryFn: () => notificacionesApi.sinLeer(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    // Si la migración del Pedido 10 todavía no corrió, no tiene sentido insistir.
    retry: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notificaciones', 'lista'],
    queryFn: () => notificacionesApi.listar({ per_page: 15 }),
    enabled: abierto,
    refetchOnMount: 'always',
    staleTime: 0,
    retry: false,
  });

  const notificaciones: Notificacion[] = data?.data ?? [];

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] });

  const leer = useMutation({
    mutationFn: (id: string) => notificacionesApi.leer(id),
    onSuccess: refrescar,
  });

  const leerTodas = useMutation({
    mutationFn: () => notificacionesApi.leerTodas(),
    onSuccess: refrescar,
  });

  const abrir = (notificacion: Notificacion) => {
    if (!notificacion.leida) leer.mutate(notificacion.id);
    if (notificacion.link) {
      setAbierto(false);
      navigate(notificacion.link);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-slate-100 dark:hover:bg-slate-700',
          'text-slate-600 dark:text-slate-400',
        )}
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {sinLeer > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setAbierto(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] max-h-[480px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Notificaciones</h3>
                <div className="flex items-center gap-1">
                  {sinLeer > 0 && (
                    <button
                      onClick={() => leerTodas.mutate()}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md',
                        'text-atlas-600 hover:bg-atlas-50 dark:text-atlas-400 dark:hover:bg-atlas-900/20',
                        'transition-colors',
                      )}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar leídas
                    </button>
                  )}
                  <button
                    onClick={() => setAbierto(false)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Cargando...</div>
                ) : notificaciones.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notificaciones.map((notificacion) => (
                      <div
                        key={notificacion.id}
                        onClick={() => abrir(notificacion)}
                        className={cn(
                          'p-3 cursor-pointer transition-colors',
                          'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                          !notificacion.leida && 'bg-atlas-50/50 dark:bg-atlas-900/10',
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-2 h-2 mt-1.5">
                            {!notificacion.leida && (
                              <span className="inline-block w-2 h-2 rounded-full bg-atlas-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  'text-sm font-medium',
                                  notificacion.leida
                                    ? 'text-slate-700 dark:text-slate-300'
                                    : 'text-slate-900 dark:text-white',
                                )}
                              >
                                {notificacion.titulo}
                              </p>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0',
                                  colorPorTipo[notificacion.tipo],
                                )}
                              >
                                {notificacion.tipo}
                              </span>
                            </div>
                            {notificacion.mensaje && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {notificacion.mensaje}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {haceCuanto(notificacion.creado_en)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
