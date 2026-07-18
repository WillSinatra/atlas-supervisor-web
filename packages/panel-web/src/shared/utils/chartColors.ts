import { useTheme } from '@/shared/contexts/ThemeContext';

// Mismo azul de marca (atlas-600/atlas-400) que ya se usa en botones, nav activo y
// spinners de toda la app — un solo hue porque estos gráficos miden una magnitud
// por categoría, no series distintas que necesiten identidad por color.
export function useChartAccentColor() {
  const { theme } = useTheme();
  return theme === 'dark' ? '#36a9f3' : '#0070c2';
}

export function useChartAxisColor() {
  const { theme } = useTheme();
  return theme === 'dark' ? '#94a3b8' : '#64748b';
}

export function useChartGridColor() {
  const { theme } = useTheme();
  return theme === 'dark' ? '#334155' : '#e2e8f0';
}
