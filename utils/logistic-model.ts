// Régression logistique minimale (descente de gradient + régularisation L2, features standardisées)
// pour le modèle combiné "Étape 4" du chantier prédiction — pas de dépendance externe (pas de
// tensorflow/ml-lib), le volume de données (145 matchs) ne le justifie pas. Régularisation L2
// (lambda=1, équivalent à C=1.0 dans scikit-learn) pour rester comparable à la validation faite en
// Python lors de cette session.

export interface LogisticFit {
  weights: number[]; // sur features standardisées
  bias: number;
  means: number[];
  stds: number[];
}

function standardize(X: number[][]): { Z: number[][]; means: number[]; stds: number[] } {
  const n = X.length;
  const d = X[0].length;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);

  for (let j = 0; j < d; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][j];
    means[j] = sum / n;
  }
  for (let j = 0; j < d; j++) {
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += (X[i][j] - means[j]) ** 2;
    stds[j] = Math.sqrt(sumSq / n) || 1;
  }

  const Z = X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { Z, means, stds };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function fitLogisticRegression(
  X: number[][],
  y: number[],
  options: { lambda?: number; lr?: number; iterations?: number } = {}
): LogisticFit {
  const { lambda = 1.0, lr = 0.3, iterations = 300 } = options;
  const { Z, means, stds } = standardize(X);
  const n = Z.length;
  const d = Z[0].length;

  const weights = new Array(d).fill(0);
  let bias = 0;

  for (let iter = 0; iter < iterations; iter++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const z = Z[i].reduce((s, v, j) => s + v * weights[j], bias);
      const p = sigmoid(z);
      const err = p - y[i];
      for (let j = 0; j < d; j++) gradW[j] += err * Z[i][j];
      gradB += err;
    }

    for (let j = 0; j < d; j++) {
      // Régularisation L2 (convention scikit-learn : le terme de pénalité n'est PAS divisé par n,
      // contrairement au terme de vraisemblance) — pénalise les poids, pas le biais.
      weights[j] -= lr * (gradW[j] / n + lambda * weights[j]);
    }
    bias -= lr * (gradB / n);
  }

  return { weights, bias, means, stds };
}

export function predictProba(fit: LogisticFit, x: number[]): number {
  const z = x.reduce((s, v, j) => s + ((v - fit.means[j]) / fit.stds[j]) * fit.weights[j], fit.bias);
  return sigmoid(z);
}

// Validation croisée leave-one-out : pour n petit (ici ~138 matchs), ré-entraîner à chaque
// itération en excluant un match donne une estimation honnête hors-échantillon — un simple fit
// unique sur tout le jeu de données survend la performance du modèle (overfitting invisible).
export function loocvPredict(
  X: number[][],
  y: number[],
  options?: { lambda?: number; lr?: number; iterations?: number }
): number[] {
  const preds: number[] = [];
  for (let i = 0; i < X.length; i++) {
    const trainX = X.filter((_, idx) => idx !== i);
    const trainY = y.filter((_, idx) => idx !== i);
    const fit = fitLogisticRegression(trainX, trainY, options);
    preds.push(predictProba(fit, X[i]));
  }
  return preds;
}
