import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardApi, mensajeDeError } from '@/shared/services/api';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
// Importaciones de Leaflet
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  MapPin, // Dejé solo una importación de MapPin
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

// Función para crear un marcador con estilos de Tailwind
const createCustomIcon = (ignition: string) => {
  return L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${ignition === '1' ? 'bg-green-500' : 'bg-red-500'}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  
  // Estado para los vehículos del mapa (le pongo any[] rápido, pero podés tiparlo mejor luego)
  const [vehiculos, setVehiculos] = useState<any[]>([]);

  // Query del Dashboard
  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
    refetchInterval: isClient ? 30000 : false,
  });

  // Efecto para inicializar el cliente
  useEffect(() => {
    setIsClient(true);
    return () => {
      queryClient.cancelQueries({ queryKey: ['dashboard'] });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto para cargar los vehículos y actualizar cada 30 segundos
  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        // REEMPLAZÁ ESTO CON TU ENDPOINT REAL
        const res = await fetch('https://facturas.netlatin.net.ar/ubicacion_atlas.php'); 
        const dataMap = await res.json();
        if (dataMap.status === 200) {
          setVehiculos(dataMap.vehiculos);
        }
      } catch (error) {
        console.error("Error cargando vehículos:", error);
      }
    };

    // Llamada inicial
    fetchVehiculos();

    // Configurar el autoupdate cada 30 segundos (30000 milisegundos)
    const intervalId = setInterval(fetchVehiculos, 30000);

    // Limpiamos el intervalo si el componente se desmonta (cambiás de página)
    return () => clearInterval(intervalId);
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

  // Cada tarjeta lleva al listado ya filtrado con el mismo criterio con el que
  // el backend calculó el número, para que lo que se ve coincida con el conteo.
  const cards = [
    {
      label: 'Órdenes Pendientes',
      value: t?.ordenes_pendientes ?? 0,
      icon: <ClipboardList className="w-5 h-5" />,
      destino: '/orders?estado=pendiente',
    },
    {
      label: 'En Proceso',
      value: t?.ordenes_en_proceso ?? 0,
      icon: <Activity className="w-5 h-5" />,
      destino: '/orders?estado=en_proceso',
    },
    {
      label: 'Completadas Hoy',
      value: t?.completadas_hoy ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      // El backend cuenta desde la medianoche UTC (su sesión corre en UTC).
      destino: `/orders?estado=completada&completadas_desde=${new Date().toISOString().slice(0, 10)}`,
    },
    {
      label: 'Vencidas',
      value: t?.ordenes_vencidas ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      destino: '/orders?vencidas=true',
    },
    {
      label: 'Cuadrillas Disponibles',
      value: t?.cuadrillas_disponibles ?? 0,
      icon: <Users className="w-5 h-5" />,
      destino: '/crews?estado=disponible',
    },
    {
      label: 'Cuadrillas Ocupadas',
      value: t?.cuadrillas_ocupadas ?? 0,
      icon: <Wrench className="w-5 h-5" />,
      destino: '/crews?estado=ocupada',
    },
  ];

  // Coordenadas centrales por defecto para el mapa
  const defaultCenter: [number, number] = [-34.6008, -58.94396];

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
          <motion.div
            key={card.label}
            variants={item}
            onClick={() => navigate(card.destino)}
            className="cursor-pointer"
            title={`Ver ${card.label.toLowerCase()}`}
          >
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
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer"
                onClick={() => navigate(`/orders/${orden.id}`)}
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
                onClick={() => navigate(`/orders/${alerta.id}`)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${alerta.vencida
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`w-4 h-4 ${alerta.vencida ? 'text-red-500' : 'text-amber-500'}`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${alerta.vencida ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                      {alerta.numero}
                    </p>
                    <p className={`text-xs ${alerta.vencida ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {alerta.sla ? `${alerta.sla.nombre} · ` : ''}
                      {textoVencimiento(alerta.minutos_restantes)}
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
                description="Ninguna orden abierta está atrasada ni por vencer en las próximas 2 horas."
              />
            )}
          </div>
        </motion.div>

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

        {/* Mapa Cuadrillas (Ahora integrado correctamente) */}
        <motion.div variants={item} className="card p-5 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-atlas-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Ubicación de Cuadrillas
              </h3>
            </div>
            {/* Leyenda chiquita */}
            <div className="flex gap-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> En marcha</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Detenido</span>
            </div>
          </div>

          {/* Contenedor del mapa */}
          <div className="h-[400px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
            <MapContainer
              center={defaultCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehiculos.map((vehiculo) => (
                <Marker
                  key={vehiculo.unit}
                  position={[vehiculo.lat, vehiculo.lon]}
                  icon={createCustomIcon(vehiculo.Ignition)}
                >
                  <Popup className="rounded-lg">
                    <div className="text-sm">
                      <p className="font-bold text-base mb-1">{vehiculo.plate}</p>
                      <p>Estado: {vehiculo.Ignition === "1" ? '🟢 En marcha' : '🔴 Apagado'}</p>
                      <p>Velocidad: {vehiculo.GpsSpeed} km/h</p>
                      <p className="text-xs text-slate-500 mt-2">Últ. reporte: {vehiculo.fecha}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}