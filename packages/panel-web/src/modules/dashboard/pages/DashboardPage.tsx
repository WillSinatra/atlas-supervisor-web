import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dashboardApi, mensajeDeError } from '@/shared/services/api';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  coloresEstado,
  etiquetasEstado,
  textoVencimiento,
  type DashboardData,
} from '@/types/atlas';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wrench,
  Activity,
  MapPin,
  Inbox,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);

  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    // La respuesta viene sin envoltorio: dashboardApi.get() ya devuelve el objeto.
    queryFn: () => dashboardApi.get(),
    refetchInterval: isClient ? 30000 : false,
  });

  // Asegura que el polling inicie solo en el cliente y se limpie al desmontar.
  useEffect(() => {
    setIsClient(true);

    // React Query gestiona el intervalo internamente; igual forzamos un cancel
    // en cleanup por si el componente se desmonta antes del primer ciclo.
    return () => {
      queryClient.cancelQueries({ queryKey: ['dashboard'] });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="No se pudo cargar el panel"
          description={mensajeDeError(error)}
        />
      </div>
    );
  }

  const t = data?.tarjetas;

  const cards = [
    {
      label: 'Órdenes Pendientes',
      value: t?.ordenes_pendientes ?? 0,
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'En Proceso',
      value: t?.ordenes_en_proceso ?? 0,
      icon: <Activity className="w-5 h-5" />,
    },
    {
      label: 'Completadas Hoy',
      value: t?.completadas_hoy ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      label: 'Vencidas',
      value: t?.ordenes_vencidas ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      label: 'Cuadrillas Disponibles',
      value: t?.cuadrillas_disponibles ?? 0,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Cuadrillas Ocupadas',
      value: t?.cuadrillas_ocupadas ?? 0,
      icon: <Wrench className="w-5 h-5" />,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Resumen operativo en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Actualizado cada 30s</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <motion.div key={card.label} variants={item}>
            <KpiCard title={card.label} value={card.value} icon={card.icon} />
          </motion.div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Órdenes recientes */}
        <motion.div variants={item} className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Órdenes Recientes</h3>
          <div className="space-y-3">
            {data?.ordenes_recientes?.slice(0, 5).map((orden) => (
              <div
                key={orden.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${coloresEstado[orden.estado]}`}
                    title={etiquetasEstado[orden.estado]}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{orden.numero}</p>
                    <p className="text-xs text-slate-500">{orden.titulo ?? orden.tipo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{orden.cliente.nombre}</p>
                  <p className="text-xs text-slate-400">{orden.cuadrilla?.nombre ?? 'Sin asignar'}</p>
                </div>
              </div>
            ))}
            {(!data?.ordenes_recientes || data.ordenes_recientes.length === 0) && (
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="Sin órdenes recientes"
                description="Las últimas órdenes de trabajo creadas van a aparecer acá."
              />
            )}
          </div>
        </motion.div>

        {/* Alertas SLA */}
        <motion.div variants={item} className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Alertas SLA
            {data?.alertas_sla && data.alertas_sla.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {data.alertas_sla.length}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {data?.alertas_sla?.slice(0, 5).map((alerta) => (
              <div
                key={alerta.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alerta.vencida
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`w-4 h-4 ${alerta.vencida ? 'text-red-500' : 'text-amber-500'}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        alerta.vencida
                          ? 'text-red-800 dark:text-red-300'
                          : 'text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {alerta.numero}
                    </p>
                    <p
                      className={`text-xs ${
                        alerta.vencida
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {alerta.sla.nombre} · {textoVencimiento(alerta.minutos_restantes)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{alerta.cliente.nombre}</p>
                  <p className="text-xs text-slate-400">{alerta.cuadrilla_nombre ?? 'Sin asignar'}</p>
                </div>
              </div>
            ))}
            {(!data?.alertas_sla || data.alertas_sla.length === 0) && (
              <EmptyState
                icon={<ShieldCheck className="w-8 h-8" />}
                title="Sin alertas activas"
                description="Ninguna orden está vencida o por vencer su SLA."
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Actividad reciente */}
      <motion.div variants={item} className="card p-5">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Actividad Reciente</h3>
        <div className="space-y-2">
          {data?.actividad?.slice(0, 8).map((evento) => (
            <div key={evento.id} className="flex items-start gap-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-atlas-600 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{evento.orden_numero}</span>
                  {' — '}
                  {evento.descripcion ?? evento.tipo_evento}
                </p>
                <p className="text-xs text-slate-400">
                  {evento.usuario_nombre ?? 'Sistema'} ·{' '}
                  {new Date(evento.creado_en).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          ))}
          {(!data?.actividad || data.actividad.length === 0) && (
            <EmptyState
              icon={<Activity className="w-8 h-8" />}
              title="Sin actividad todavía"
              description="Los movimientos de las órdenes van a aparecer acá."
            />
          )}
        </div>
      </motion.div>

      {/* Mapa placeholder */}
      <motion.div variants={item} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-atlas-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ubicación de Cuadrillas</h3>
        </div>
        <div className="h-64 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2">
          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mapa interactivo próximamente</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Ubicación de cuadrillas en tiempo real</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
