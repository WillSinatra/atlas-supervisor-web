export function generateGradient(hexColor: string | null | undefined): string | undefined {
  if (!hexColor) return undefined;
  
  const colorGradients: Record<string, string> = {
    '#E63946': 'linear-gradient(90deg, #E63946 0%, #C1121F 100%)',
    '#7C8BA3': 'linear-gradient(90deg, #7C8BA3 0%, #5A6A7A 100%)',
    '#FF8C42': 'linear-gradient(90deg, #FF8C42 0%, #D87430 100%)',
    '#E85D75': 'linear-gradient(90deg, #E85D75 0%, #C84B61 100%)',
    '#FFD166': 'linear-gradient(90deg, #FFD166 0%, #E0B850 100%)',
    '#06D6A0': 'linear-gradient(90deg, #06D6A0 0%, #04B88F 100%)',
    '#8B6F47': 'linear-gradient(90deg, #8B6F47 0%, #6D5735 100%)',
  };
  
  return colorGradients[hexColor.toUpperCase()] || `linear-gradient(90deg, ${hexColor} 0%, ${hexColor}dd 100%)`;
}
