# 🎯 PST — Paris Saint-Tropez 2026

> *Le classement officiel ELO de la Résidence. Archives historiques · Vidéos privées · Esprit club.*

Application web privée de gestion de tournois de **pétanque** entre amis, saison après saison. Doublettes, tableaux, finales, scores en direct — et un algorithme ELO maison pour départager les champions.

---

## ✨ Fonctionnalités

| Section | Description |
|---|---|
| 🏆 **Classement ELO** | Ranking en temps réel de tous les joueurs inscrits |
| ⚔️ **Tournois** | Archives des éditions passées, finales et résultats |
| 📡 **Live** | Suivi des matchs en cours (tableau en temps réel) |
| 🎬 **Vidéos** | Zone membres — replays et moments forts privés |
| 📖 **Le Concept** | Organisation des poules et route vers la finale |
| 📐 **L'Algorithme** | Explication du calcul ELO Classic vs Modern |

---

## ⚙️ Stack technique

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router) + React 19
- **Backend / Auth / Storage** : [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **Style** : Tailwind CSS v4
- **Graphiques** : Recharts
- **Icônes** : Lucide React
- **Langage** : TypeScript

---

## 📐 L'algorithme ELO

Deux méthodes de calcul coexistent, configurables via les paramètres admin :

### PST Classic *(inspirée IRB Rugby)*
Basée sur l'écart de points ELO entre les deux équipes, plafonnée par `max_ecart`. Le gain est modulé par :
- le **type de match** (`poids_finale`, `poids_finaliste` pour les demi-finales)
- le **bonus fessée** si l'écart de score dépasse `bonus_seuil`

```ts
gain = (1 - (D / seuil)) * multiplier   // en cas de victoire
```

### Modern ELO *(FIDE / Probabiliste)*
Formule classique avec probabilité attendue et facteur K configurable :

```ts
expected = 1 / (1 + 10^((elo2 - elo1) / 400))
gain = K * (résultat - expected)
```

---

## 🚀 Lancer le projet en local

### Prérequis
- Node.js ≥ 20
- Un projet Supabase configuré

### Installation

```bash
git clone https://github.com/e-coucou/pst-2026.git
cd pst-2026
npm install
```

### Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Démarrage

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Structure du projet

```
pst-2026/
├── app/
│   ├── page.tsx              # Page d'accueil
│   ├── classement/           # Leaderboard ELO
│   ├── tournois/             # Archives par année
│   ├── live/                 # Suivi des matchs en direct
│   ├── joueurs/              # Fiches joueurs
│   ├── videos/               # Zone membres (vidéos)
│   ├── concept/              # Règlement & format
│   ├── regles-elo/           # Explication algorithme
│   ├── login/ signup/        # Authentification
│   └── api/                  # Routes API Next.js
├── components/
│   ├── EloChart.tsx          # Graphique évolution ELO
│   ├── GlobalProgressionChart.tsx
│   ├── SeasonHistory.tsx     # Historique par saison
│   └── Navbar.tsx
├── lib/
│   ├── elo-engine.ts         # Moteur de calcul ELO
│   └── supabase.ts
├── scripts/
│   └── recompute-elo.ts      # Recalcul ELO global
└── utils/supabase/           # Clients Supabase (SSR + client)
```

---

## 🔧 Scripts utilitaires

```bash
# Recalculer l'ensemble des scores ELO depuis l'historique
npx tsx scripts/recompute-elo.ts
```

---

## 🔐 Accès & authentification

L'application est réservée aux membres inscrits. Certaines sections (vidéos, espace live admin) nécessitent des droits spécifiques gérés côté Supabase (RLS + rôles).

---

## 🚢 Déploiement

Le plus simple est de déployer sur [Vercel](https://vercel.com) — la plateforme des créateurs de Next.js.

```bash
npm run build
```

---

*Design & Code by eCoucou Digital Engine · 2026*
