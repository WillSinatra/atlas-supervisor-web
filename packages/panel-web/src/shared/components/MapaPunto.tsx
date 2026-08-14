import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Un punto en el mapa. Nada más: no hay capas, ni rutas, ni clustering.
 *
 * El pin se dibuja con un `divIcon` en vez del marcador que trae Leaflet porque
 * ese depende de tres PNG que Vite no resuelve solo — la falla clásica del
 * marcador roto. Así el ícono viaja en el mismo bundle y no hay assets sueltos.
 */

const pin = divIcon({
  className: '',
  html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" fill="#0284c7" stroke="#fff" stroke-width="1.6"/>
    <circle cx="12" cy="11" r="2.6" fill="#fff"/>
  </svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

/** Recentra cuando cambian las coordenadas, sin recrear el mapa entero. */
function Recentrar({ lat, lng }: { lat: number; lng: number }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView([lat, lng], mapa.getZoom());
    // Leaflet calcula mal el tamaño si nació dentro de algo que estaba oculto
    // (una tarjeta que se despliega, un modal): esto lo obliga a recalcular.
    const t = setTimeout(() => mapa.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [lat, lng, mapa]);
  return null;
}

export function MapaPunto({
  lat,
  lng,
  zoom = 16,
  className = 'h-44',
}: {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700`}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={pin} />
        <Recentrar lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
