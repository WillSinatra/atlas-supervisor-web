/**
 * Código de barras Code 128 (subconjunto B), dibujado acá mismo.
 *
 * Se codifica en el panel y no en el servidor por una razón práctica: la
 * etiqueta se imprime desde el navegador, y mandar una imagen por material
 * significaría una petición por etiqueta cada vez que el pañolero imprime una
 * hoja de treinta. Con esto la hoja se arma sola y anda sin conexión.
 *
 * Se eligió Code 128 B porque acepta cualquier carácter imprimible: sirve tanto
 * para los códigos numéricos que genera Atlas (13 dígitos, con la misma forma
 * que un EAN-13) como para los códigos internos alfanuméricos que ya estaban
 * cargados. Todos los lectores de mano lo leen sin configurarles nada.
 */

/**
 * Tabla del estándar: para cada símbolo, los anchos de sus barras y espacios en
 * módulos, alternando barra-espacio-barra-... El último (106, el de parada)
 * tiene un elemento de más, que es lo que cierra el código.
 */
const PATRONES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const INICIO_B = 104;
const PARADA = 106;

/** Módulos en blanco a cada lado. Sin esto muchos lectores no enganchan. */
export const ZONA_MUDA = 10;

/**
 * Convierte el texto en la lista de anchos que hay que dibujar, empezando
 * siempre por una barra y alternando con espacios.
 *
 * Devuelve null si el texto está vacío o tiene algún carácter que Code 128 B no
 * puede representar (acentos, por ejemplo): quien llama decide qué mostrar en
 * lugar del código, en vez de imprimir una etiqueta que no se va a poder leer.
 */
export function anchosCode128(texto: string): number[] | null {
  const valores: number[] = [];
  for (const caracter of texto) {
    const codigo = caracter.charCodeAt(0);
    if (codigo < 32 || codigo > 126) return null;
    valores.push(codigo - 32);
  }
  if (valores.length === 0) return null;

  // Dígito verificador: arranca en el símbolo de inicio y cada carácter pesa
  // según su posición.
  let suma = INICIO_B;
  valores.forEach((valor, i) => {
    suma += valor * (i + 1);
  });

  const simbolos = [INICIO_B, ...valores, suma % 103, PARADA];
  const anchos: number[] = [];
  for (const simbolo of simbolos) {
    for (const digito of PATRONES[simbolo]) anchos.push(Number(digito));
  }
  return anchos;
}

/** Las barras negras, ya ubicadas. Los índices pares son barras; los impares, espacios. */
export function barrasDe(anchos: number[]): { x: number; ancho: number }[] {
  const barras: { x: number; ancho: number }[] = [];
  let x = ZONA_MUDA;
  anchos.forEach((ancho, i) => {
    if (i % 2 === 0) barras.push({ x, ancho });
    x += ancho;
  });
  return barras;
}

/** Ancho total en módulos, contando las dos zonas mudas. */
export function anchoTotal(anchos: number[]): number {
  return anchos.reduce((total, ancho) => total + ancho, 0) + ZONA_MUDA * 2;
}

/**
 * ¿Este código lo generó Atlas? Son 13 dígitos que empiezan con 200 — el rango
 * que el estándar EAN reserva para uso interno, así que nunca choca con el
 * código de fábrica de un producto comprado.
 */
export function esCodigoPropio(codigo: string | null | undefined): boolean {
  return !!codigo && /^200\d{10}$/.test(codigo);
}
