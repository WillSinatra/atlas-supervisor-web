import { useMemo } from 'react';
import { anchoTotal, anchosCode128, barrasDe } from '@/shared/utils/codigoBarras';

interface CodigoBarrasProps {
  valor: string;
  /** Alto de las barras, en módulos. 40 es lo habitual para una etiqueta chica. */
  alto?: number;
  /** Si se escribe el código debajo. Conviene: sirve para tipearlo a mano si el lector falla. */
  mostrarTexto?: boolean;
  className?: string;
}

/**
 * Dibuja el código de barras como SVG, sin dependencias.
 *
 * El SVG usa el módulo como unidad y se estira al ancho que le den, así la
 * misma etiqueta sirve en pantalla y en papel: lo que importa para que un lector
 * lo lea es el ancho físico impreso, no los píxeles.
 */
export function CodigoBarras({ valor, alto = 40, mostrarTexto = true, className }: CodigoBarrasProps) {
  const anchos = useMemo(() => anchosCode128(valor), [valor]);

  if (!anchos) {
    return (
      <span className="text-xs text-slate-400" title="Code 128 no puede representar este código">
        {valor || 'Sin código'}
      </span>
    );
  }

  const ancho = anchoTotal(anchos);
  const altoTexto = mostrarTexto ? 14 : 0;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto + altoTexto}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Código de barras ${valor}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Fondo blanco explícito: en modo oscuro el SVG heredaría el fondo de la
          tarjeta y el lector necesita contraste barra-negra sobre blanco. */}
      <rect x="0" y="0" width={ancho} height={alto + altoTexto} fill="#ffffff" />
      {barrasDe(anchos).map((barra, i) => (
        <rect key={i} x={barra.x} y="0" width={barra.ancho} height={alto} fill="#000000" />
      ))}
      {mostrarTexto && (
        <text
          x={ancho / 2}
          y={alto + 11}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          letterSpacing="1"
          fill="#000000"
        >
          {valor}
        </text>
      )}
    </svg>
  );
}
