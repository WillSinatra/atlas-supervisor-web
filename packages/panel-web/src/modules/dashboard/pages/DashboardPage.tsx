import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { dashboardApi } from '@/shared/services/api';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { DashboardData } from '@/types';
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

const statusColors: Record<string, string> = {
  PENDING: 'bg-slate-400',
  ASSIGNED: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await dashboardApi.get();
      return response.data.data as DashboardData;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-atlas-600" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Órdenes Pendientes',
      value: data?.cards.pendingOrders ?? 0,
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'En Progreso',
      value: data?.cards.inProgressOrders ?? 0,
      icon: <Activity className="w-5 h-5" />,
    },
    {
      label: 'Completadas Hoy',
      value: data?.cards.completedToday ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      label: 'Vencidas',
      value: data?.cards.overdueOrders ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      label: 'Cuadrillas Disponibles',
      value: data?.cards.availableCrews ?? 0,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Cuadrillas Ocupadas',
      value: data?.cards.busyCrews ?? 0,
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
            {data?.recentOrders?.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusColors[order.status]}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500">{order.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {order.customer?.firstName} {order.customer?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{order.crew?.name || 'Sin asignar'}</p>
                </div>
              </div>
            ))}
            {(!data?.recentOrders || data.recentOrders.length === 0) && (
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
            {data?.slaAlerts && data.slaAlerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {data.slaAlerts.length}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {data?.slaAlerts?.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{alert.orderNumber}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      SLA: {alert.sla?.name} - Límite: {alert.sla?.resolveTime}min
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.slaAlerts || data.slaAlerts.length === 0) && (
              <EmptyState
                icon={<ShieldCheck className="w-8 h-8" />}
                title="Sin alertas activas"
                description="Ninguna orden está vencida o por vencer su SLA."
              />
            )}
          </div>
        </motion.div>
      </div>

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