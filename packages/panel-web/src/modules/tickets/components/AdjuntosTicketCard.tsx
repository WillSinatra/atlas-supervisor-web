import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Paperclip, Trash2 } from 'lucide-react';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { archivosApi, mensajeDeError } from '@/shared/services/api';
import { ArchivoImagen, VisorImagen } from '@/shared/components/ArchivoImagen';

/** Formatos que acepta la API. El SVG está por la firma, pero no molesta acá. */
const ACEPTA = 'image/jpeg,image/png,image/webp,image/gif';

interface AdjuntosTicketCardProps {
  ticketId: string;
}

/**
 * Las imágenes del reclamo: la foto de las luces del modem, del cable cortado,
 * del cartel de error. Suelen decir más que la descripción, y son lo que le
 * permite a N2 resolver sin mandar a nadie.
 */
export function AdjuntosTicketCard({ ticketId }: AdjuntosTicketCardProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [viendo, setViendo] = useState<string | null>(null);

  const { data: fotos, isLoading } = useQuery({
    queryKey: ['ticket-fotos', ticketId],
    queryFn: () => archivosApi.fotosDeTicket(ticketId),
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['ticket-fotos', ticketId] });

  const subir = useMutation({
    // Se suben de a una y en serie: si una falla, las anteriores ya quedaron
    // guardadas en vez de perderse todas juntas.
    mutationFn: async (archivos: File[]) => {
      for (const archivo of archivos) {
        await archivosApi.subirFotoTicket(ticketId, archivo);
      }
    },
    onSuccess: refrescar,
  });

  const borrar = useMutation({
    mutationFn: (id: string) => archivosApi.eliminar(id),
    onSuccess: refrescar,
  });

  const elegir = (lista: FileList | null) => {
    const archivos = Array.from(lista ?? []);
    if (archivos.length > 0) subir.mutate(archivos);
    // Se limpia para que volver a elegir el mismo archivo dispare el change.
    if (inputRef.current) inputRef.current.value = '';
  };

  const lista = fotos ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-atlas-600" /> Imágenes
          {lista.length > 0 && (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{lista.length}</span>
          )}
        </h3>
        <Button
          variant="secondary"
          size="sm"
          icon={<ImagePlus className="w-4 h-4" />}
          loading={subir.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Agregar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACEPTA}
          multiple
          className="hidden"
          onChange={(e) => elegir(e.target.files)}
        />
      </div>

      {subir.isError && (
        <div className="mb-3">
          <Alert variant="error" title="No se pudo subir">
            {mensajeDeError(subir.error)}
          </Alert>
        </div>
      )}
      {borrar.isError && (
        <div className="mb-3">
          <Alert variant="error">{mensajeDeError(borrar.error)}</Alert>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin imágenes. Si el cliente mandó una foto del equipo o del problema, adjuntala acá: en muchos casos
          alcanza para resolver sin visita.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {lista.map((foto) => (
            <div
              key={foto.id}
              className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <ArchivoImagen
                archivoId={foto.id}
                alt={foto.nombre_original ?? 'Imagen del ticket'}
                className="w-full h-24 object-cover"
                onClick={() => setViendo(foto.id)}
              />
              <button
                type="button"
                title="Quitar la imagen"
                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => borrar.mutate(foto.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <VisorImagen archivoId={viendo} titulo="Imagen del ticket" onClose={() => setViendo(null)} />
    </div>
  );
}
