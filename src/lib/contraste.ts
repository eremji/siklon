// Rapport de contraste WCAG 2 entre deux couleurs (US-15) : 4,5:1 pour le texte, 3:1 pour le graphisme.

function luminance(hex: string): number {
  const correspondance = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!correspondance) throw new Error(`Couleur attendue en #RRGGBB : ${hex}`);
  const [r, v, b] = correspondance.slice(1).map((canal) => {
    const c = Number.parseInt(canal, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

export function ratioContraste(premiere: string, seconde: string): number {
  const [claire, foncee] = [luminance(premiere), luminance(seconde)].sort((a, b) => b - a);
  return (claire + 0.05) / (foncee + 0.05);
}
