import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/shared/hooks/usePushNotifications';

const DESCARTADO_KEY = 'push-banner-descartado';

export default function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission, yaConsintio } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // "Ahora no" solo tapa el banner por esta pestaña (sessionStorage); una
    // respuesta real —permitir o rechazar en el diálogo nativo— se guarda en
    // el backend vía yaConsintio y no vuelve a aparecer en ningún login.
    const yaDescartado = sessionStorage.getItem(DESCARTADO_KEY) === '1';
    const vapidConfigurada = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);

    setVisible(isSupported && vapidConfigurada && permission === 'default' && !yaDescartado && !yaConsintio);
  }, [isSupported, permission, yaConsintio]);

  if (!visible) return null;

  const descartar = () => {
    sessionStorage.setItem(DESCARTADO_KEY, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="fixed top-0 inset-x-0 z-[60] bg-atlas-600 text-white px-4 py-2.5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>Activá las notificaciones para enterarte al instante de las tareas que te asignen.</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => requestPermission()}
            className="bg-white text-atlas-600 px-3 py-1 rounded-md font-medium text-sm hover:bg-slate-100"
          >
            Permitir
          </button>
          <button
            onClick={descartar}
            className="p-1.5 rounded-md hover:bg-white/10"
            title="Ahora no"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
