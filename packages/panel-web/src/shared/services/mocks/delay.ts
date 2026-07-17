/** Simula latencia de red para que el reemplazo futuro por un fetch real no cambie el comportamiento de loading de las pantallas. */
export function simulateDelay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
