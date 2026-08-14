import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { clientesApi } from '@/shared/services/api';
import type { Cliente } from '@/types/atlas';

interface BuscadorClienteProps {
  cliente: Cliente | null;
  onSeleccionar: (cliente: Cliente | null) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Buscar y elegir un cliente del padrón.
 *
 * Vive acá y no dentro de una pantalla porque hace falta en tres: al crear una
 * orden, al corregirla, y al cargar un ticket. Antes estaba copiado en Nueva
 * Orden y en ningún otro lado, que es por lo que el ticket terminaba con el
 * nombre del cliente escrito a mano.
 */
export function BuscadorCliente({
  cliente,
  onSeleccionar,
  label = 'Cliente *',
  error,
  disabled,
}: BuscadorClienteProps) {
  const [texto, setTexto] = useState(cliente?.nombre ?? '');
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTexto(cliente?.nombre ?? '');
  }, [cliente]);

  // Cerrar al hacer click afuera: si no, la lista queda flotando sobre el resto
  // del formulario.
  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', alClickear);
    return () => document.removeEventListener('mousedown', alClickear);
  }, [abierto]);

  const { data, isFetching } = useQuery({
    queryKey: ['clientes', 'buscar', texto],
    queryFn: () => clientesApi.listar({ q: texto.trim(), per_page: 8 }),
    enabled: abierto && !cliente && texto.trim().length >= 2,
  });

  const resultados = data?.data ?? [];

  return (
    <div className="relative" ref={contenedor}>
      <Input
        label={label}
        placeholder="Buscar por nombre, teléfono o email..."
        leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        error={error}
        value={texto}
        disabled={disabled}
        autoComplete="off"
        rightIcon={
          cliente ? (
            <button
              type="button"
              title="Elegir otro cliente"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => {
                onSeleccionar(null);
                setTexto('');
                setAbierto(true);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          ) : undefined
        }
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          if (cliente) onSeleccionar(null);
        }}
        onFocus={() => setAbierto(true)}
      />

      {abierto && !cliente && texto.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-56 overflow-y-auto">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-slate-400">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
          ) : (
            resultados.map((c) => (
              <button
                type="button"
                key={c.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => {
                  onSeleccionar(c);
                  setAbierto(false);
                }}
              >
                <span className="font-medium text-slate-900 dark:text-white">{c.nombre}</span>
                {c.telefono && <span className="text-slate-400"> · {c.telefono}</span>}
              </button>
            ))
          )}
        </div>
      )}

      {cliente && (
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Cliente seleccionado
        </p>
      )}
    </div>
  );
}
