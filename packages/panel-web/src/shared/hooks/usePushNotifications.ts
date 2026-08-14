import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { pushService } from '@/shared/services/pushService';

/**
 * Pide permiso de notificaciones push y registra la suscripción del
 * navegador contra el backend. Sin VITE_VAPID_PUBLIC_KEY configurada no hace
 * nada: no tiene sentido pedir permiso si después no se puede suscribir.
 */
export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [isSupported] = useState(
    () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  );
  // Si ya contestó al banner alguna vez (en este navegador o en otro), no se
  // le vuelve a preguntar en logins siguientes.
  const [yaConsintio, setYaConsintio] = useState(false);

  useEffect(() => {
    if (!isSupported || !isAuthenticated || !user) return;

    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch((error) => {
      console.error('No se pudo registrar el service worker de notificaciones', error);
    });

    if (Notification.permission === 'granted') {
      void suscribir();
    }

    pushService
      .obtenerConsentimiento()
      .then((res) => setYaConsintio(res.yaConsintio))
      .catch(() => setYaConsintio(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, isAuthenticated, user?.id]);

  const suscribir = useCallback(async () => {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });
      }

      await pushService.guardarSuscripcion(subscription);
    } catch (error) {
      console.error('Error suscribiendo a notificaciones push', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return;

    const resultado = await Notification.requestPermission();
    setPermission(resultado);

    if (resultado === 'granted') {
      await suscribir();
    }

    // Se guarda tanto si acepta como si rechaza: lo que importa es que ya
    // contestó, no volver a mostrarle el banner en el próximo login.
    try {
      await pushService.guardarConsentimiento();
      setYaConsintio(true);
    } catch (error) {
      console.error('Error guardando consentimiento de notificaciones', error);
    }
  }, [isSupported, suscribir]);

  return { permission, isSupported, requestPermission, yaConsintio };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
