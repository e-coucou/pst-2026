// Constantes des modèles de prédiction Classic/Modern (écart de moyenne d'équipe → CDF normale),
// partagées entre la calibration (utils/prediction-calibration.ts) et le "brain" a posteriori
// (app/api/predict/match/[id]/route.ts) pour qu'ils prédisent toujours la même chose pour un même
// match. Valeurs trouvées par recherche en grille minimisant le score de Brier sur les 145 matchs
// archivés (session du 2026-08-07) — voir le détail de la démarche dans prediction-calibration.ts.
// Volontairement distinctes de PREDICTION_CONFIG.volatilityPerPlayer (150) du module de pronostic
// live (PredictionModal.tsx), pas encore mis à jour — décision différée à l'étape 5 du plan.

export const CLASSIC_VOLATILITY = 24;
export const CLASSIC_SIGMA = Math.sqrt(CLASSIC_VOLATILITY * CLASSIC_VOLATILITY * 2);

export const MODERN_VOLATILITY = 136;
export const MODERN_SIGMA = Math.sqrt(MODERN_VOLATILITY * MODERN_VOLATILITY * 2);

export const ELO_INIT = 100; // même valeur par défaut que le reste de l'app pour un joueur sans historique
