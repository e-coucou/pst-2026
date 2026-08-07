// Extrait de PredictionModal.tsx (module de prédiction live) pour être réutilisé par la
// calibration a posteriori (utils/prediction-calibration.ts) sans dupliquer l'approximation.

// Approximation de la fonction d'erreur (erf) - Abramowitz & Stegun
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}

// CDF de la loi normale — P(X ≤ x) pour X ~ N(mean, stdDev²)
export function normalCDF(mean: number, stdDev: number, x: number = 0): number {
  if (stdDev === 0) return x >= mean ? 1 : 0;
  const res = 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
  return isNaN(res) ? 0.5 : Math.max(0, Math.min(1, res));
}
