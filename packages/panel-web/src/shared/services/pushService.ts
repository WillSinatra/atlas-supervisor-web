import { api } from './api';

/**
 * Suscripciones push del navegador (Web Push API). El backend las usa para
 * avisar de tareas nuevas aunque el panel esté cerrado — hasta ahora la
 * campanita solo se actualizaba con polling (ver NotificationsDropdown).
 */
export const pushService = {
  async guardarSuscripcion(subscription: PushSubscription) {
    const authKey = subscription.getKey('auth');
    const p256dhKey = subscription.getKey('p256dh');

    await api.post('/v1/notificaciones/suscripcion-push', {
      endpoint: subscription.endpoint,
      auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : '',
      p256dh: p256dhKey ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey))) : '',
      userAgent: navigator.userAgent,
    });
  },

  async eliminarSuscripcion(endpoint: string) {
    await api.delete('/v1/notificaciones/suscripcion-push', { data: { endpoint } });
  },

  /** Si ya contestó al banner de notificaciones, para no volver a preguntarle en el próximo login. */
  async obtenerConsentimiento() {
    const { data } = await api.get<{ yaConsintio: boolean; fecha: string | null }>(
      '/v1/notificaciones/consentimiento-push',
    );
    return data;
  },

  async guardarConsentimiento() {
    await api.post('/v1/notificaciones/consentimiento-push');
  },
};
