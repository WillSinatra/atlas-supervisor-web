/** Distancia en km entre dos puntos geográficos (fórmula de Haversine). */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export type MotivoCoordenadas = 'vacio' | 'acortado' | 'sin_coordenadas' | 'fuera_de_rango';

export type ResultadoCoordenadas =
  | { ok: true; coordenadas: Coordenadas }
  | { ok: false; motivo: MotivoCoordenadas };

const RANGO_OK = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

/**
 * Saca las coordenadas de lo que sea que peguen: un par de números, o un link
 * de Google Maps de cualquiera de las formas en que se comparte.
 *
 * Se contemplan:
 *   -37.3217, -59.1332           el par pelado
 *   .../maps/@-37.3217,-59.13,17z        link de escritorio
 *   .../maps/place/X/@-37.32,-59.13,17z  compartir un lugar
 *   ...!3d-37.3217!4d-59.1332            el formato interno del place
 *   ...?q=-37.32,-59.13  ·  ?query=  ·  ?ll=   variantes de la API de Maps
 *
 * Los links cortos (maps.app.goo.gl, goo.gl/maps) **no se pueden resolver acá**:
 * son una redirección que el navegador no puede seguir desde otro dominio. Por
 * eso devuelven un motivo propio, para poder explicarlo en vez de un "no se
 * entiende" que deja a la persona sin saber qué hacer.
 */
export function parsearCoordenadas(texto: string): ResultadoCoordenadas {
  const limpio = texto.trim();
  if (limpio === '') return { ok: false, motivo: 'vacio' };

  if (/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(limpio)) {
    return { ok: false, motivo: 'acortado' };
  }

  // El orden importa: !3d!4d es el más específico y aparece junto con un @ que
  // a veces apunta al centro del mapa y no al lugar en sí.
  const patrones: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|daddr|destination)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
  ];

  for (const patron of patrones) {
    const match = limpio.match(patron);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!RANGO_OK(lat, lng)) return { ok: false, motivo: 'fuera_de_rango' };
    return { ok: true, coordenadas: { lat, lng } };
  }

  return { ok: false, motivo: 'sin_coordenadas' };
}

export const motivosCoordenadas: Record<MotivoCoordenadas, string> = {
  vacio: 'Pegá el link o las coordenadas.',
  acortado:
    'Ese link es de los cortos y no se puede leer desde acá. Abrilo en el navegador y copiá el link largo que queda en la barra de direcciones.',
  sin_coordenadas: 'No encontré coordenadas ahí. Probá con el link largo de Google Maps, o escribí "latitud, longitud".',
  fuera_de_rango: 'Esas coordenadas están fuera de rango. La latitud va de -90 a 90 y la longitud de -180 a 180.',
};

/** Link para abrir el punto en Google Maps. */
export function urlGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Link para que el navegador arranque la navegación hasta el punto. */
export function urlComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Redondeo a 6 decimales: ~11 cm, de sobra para una casa. */
export function formatearCoordenadas(lat: number, lng: number): string {
  const r = (n: number) => Number(n.toFixed(6));
  return `${r(lat)}, ${r(lng)}`;
}
