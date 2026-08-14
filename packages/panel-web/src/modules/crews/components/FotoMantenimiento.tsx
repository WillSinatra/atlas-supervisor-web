import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { archivosApi } from '@/shared/services/api';

interface FotoMantenimientoProps {
  fotoUrl: string | null;
  className?: string;
}

/**
 * La descarga de /v1/archivos/{id} exige el header Authorization, así que un
 * <img src="/v1/archivos/x"> directo devuelve 401. Se resuelve como blob y se
 * arma un object URL, que se revoca al desmontar o cambiar de foto.
 */
function useArchivoUrl(archivoId: string | null): { src: string | null; fallo: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setFallo(false);
    if (!archivoId) {
      setSrc(null);
      return;
    }
    let vigente = true;
    let creado: string | null = null;

    archivosApi
      .urlDeArchivo(archivoId)
      .then((u) => {
        if (!vigente) {
          URL.revokeObjectURL(u);
          return;
        }
        creado = u;
        setSrc(u);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });

    return () => {
      vigente = false;
      if (creado) URL.revokeObjectURL(creado);
    };
  }, [archivoId]);

  return { src, fallo };
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600 ${className ?? ''}`}
    >
      <ImageOff className="w-5 h-5 text-slate-400" />
    </div>
  );
}

/** Miniatura de foto de un registro de mantenimiento, con fallback a placeholder. */
export function FotoMantenimiento({ fotoUrl, className }: FotoMantenimientoProps) {
  const { src, fallo } = useArchivoUrl(fotoUrl);
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => setImagenRota(false), [fotoUrl]);

  if (!fotoUrl || fallo || imagenRota) return <Placeholder className={className} />;

  if (!src) {
    return <div className={`bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg ${className ?? ''}`} />;
  }

  return (
    <img
      src={src}
      alt="Foto del servicio"
      className={`object-cover rounded-lg ${className ?? ''}`}
      onError={() => setImagenRota(true)}
    />
  );
}
