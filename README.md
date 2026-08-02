# 🎯 PST — Paris Saint-Tropez 2026

> *Le classement officiel ELO de la Résidence. Archives historiques · Vidéos privées · Esprit club.*

Application web privée de gestion de tournois de **pétanque** entre amis, saison après saison. Doublettes, tableaux, finales, scores en direct — et un algorithme ELO maison pour départager les champions.

---

## ✨ Fonctionnalités

| Section | Description |
|---|---|
| 🏆 **Classement ELO** | Ranking en temps réel de tous les joueurs, double méthode (Classic + Modern) |
| 👤 **Fiche joueur** | Profil détaillé : courbe ELO, stats, historique saison par saison |
| ⚔️ **Tournois** | Archives des éditions passées par année, poules, finales et résultats |
| 📊 **Statistiques** | Tableaux de bord globaux (distribution des scores, tendances) |
| 📡 **Live** | Suivi du tournoi en cours en temps réel (Supabase Realtime) — 3 formats au choix : classique (8 équipes, poules → demies → finales), 10 équipes (2 poules de 5 → 5 finales classées) ou Ronde (système suisse, 4 rondes → 5 finales classées) |
| 🧠 **Prono IA** | Prédiction probabiliste du score d'un match à venir (modèle statistique local, pas de LLM) |
| 🎬 **Médiathèque** | Hub `/videos` (Vidéos / Photos / Contribuez) — replays YouTube, galerie photo alimentée par les membres (upload compressé côté navigateur, miniatures + version complète) |
| 📱 **Partage** | Page plein écran avec QR code d'invitation |
| 📖 **Le Concept** | Organisation des poules, tirage au sort et route vers la finale |
| 📐 **L'Algorithme** | Explication pédagogique du calcul ELO Classic vs Modern |
| 🔧 **Panel Admin / Super** | Pilotage du tournoi live, gestion des joueurs/équipes, réglages ELO, recalcul d'historique (accès par rôle). Constitution des équipes automatique ou en tirage au sort révélé en direct |
| 🕵️ **Journal d'activité** *(super)* | Traçabilité des actions admin et des consultations (pages, joueurs, tournois, photos) + page "Qui est en ligne" + stats de popularité |
| 🏠 **Résidence — gestion** *(super)* | CRUD complet sous l'onglet Résidence (`/render/prive`) : contacts par catégorie (Conseil Syndical, Gardien, Copropriétaires, Locataires, Fournisseurs) avec partage vCard en un tap sur iPhone, bibliothèque de documents PDF (Syndic, Fournisseurs, AG, PV...) hébergés sur Google Drive avec résumé markdown optionnel, codes d'accès de la résidence — accès rapide aux codes directement depuis le panel super |
| 🔑 **Résidence — accès par palier** | Les membres/admins peuvent être élevés à un palier de lecture résidence (géré depuis `/live/users`) : **Consultation** (documents + codes) ou **Avancé** (+ contacts + résumés des documents + fiches signalétiques des lots). Aucun accès par défaut — jamais "public" au sens non-authentifié |
| 📋 **Résidence — fiches signalétiques** | 221 lots des Bâtiments A et B (studios, appartements, box, caves, chambres de bonne, placards) issus de l'état descriptif de division d'un acte notarié : composition, tantièmes, situation. Consultables par recherche filtrable par bâtiment (`/render/lots`) ou directement au double-clic dans le plan 3D pour les 110 lots du Bâtiment B reliés à un objet du modèle (le Bâtiment A n'est pas encore modélisé en 3D) |

---

## ⚙️ Stack technique

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router) + React 19
- **Backend / Auth / Storage** : [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **Style** : Tailwind CSS v4
- **Graphiques** : Recharts
- **3D** : Three.js / React Three Fiber (modélisation de la résidence — voir `documents/architecture.md`)
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
│   ├── page.tsx                 # Page d'accueil
│   ├── (acces)/                 # Login / Signup / Reset mot de passe (comptes pseudo) / Logout
│   ├── auth/callback/           # Callback OAuth Google (revérifie le code d'invitation)
│   ├── (sections)/              # Pages publiques : classement, tournois,
│   │                             # stats, concept, regles-elo, share, render
│   │   └── videos/               # Hub médiathèque : gallery/ (vidéos), photos/, upload/
│   ├── joueurs/[id]/            # Fiche joueur détaillée
│   ├── live/                    # Espace tournoi en direct
│   │   ├── (admin)/              # Pilotage tournoi (rôle admin/super)
│   │   └── (super)/              # Administration système (rôle super)
│   │       ├── activity/          # Journal d'activité (filtrable par section)
│   │       └── online/            # Qui est en ligne (fenêtre glissante 1h)
│   └── api/                     # Routes API (recalcul ELO, reset mot de passe, lecture .md)
├── components/                  # Navbar, Footer, EloChart, Stepper,
│                                 # GlobalLoadingBar, PageViewTracker,
│                                 # PredictionModal, SeasonHistory, ...
├── lib/
│   ├── elo-engine.ts             # Moteur de calcul ELO (2 méthodes)
│   ├── auth-actions.ts           # Code d'invitation, vérif. rôle admin
│   └── supabase.ts
├── utils/
│   ├── elo-logic.ts              # Orchestration du calcul ELO par match
│   ├── live-stats.ts             # Agrégation des deltas ELO live
│   ├── log-activity.ts           # Enregistrement d'activité (exclut le rôle super)
│   ├── activity-format.ts        # Libellés/format partagés (journal, qui est en ligne)
│   └── supabase/                 # Clients Supabase (SSR + navigateur)
├── data/residence.ts             # Modèle paramétrique du bâtiment (rendu 3D)
├── documents/                    # Documentation approfondie (voir ci-dessous)
│   └── private/                  # Documents non versionnés (PDF AG, rapprochements)
├── proxy.ts                      # Middleware Next.js 16 (auth/session)
└── scripts/                      # Scripts CLI (recompute-elo, live-elo)
```

---

## 📚 Documentation approfondie

- [`documents/architecture.md`](./documents/architecture.md) — routes, modèle de données Supabase, moteur ELO, machine à états du live (3 formats), module de prédiction, dette technique connue
- [`documents/rondes.md`](./documents/rondes.md) — format "Ronde" (système suisse à 10 équipes) : appariement, anti-rematch, finales classées
- [`documents/design-system.md`](./documents/design-system.md) — palette, typographie, composants UI, écarts avec `charte.md`
- [`charte.md`](./charte.md) — charte graphique narrative d'origine (consultable dans l'app via `/live/charte`)

---

## 🔧 Scripts utilitaires

```bash
# Recalculer l'ensemble des scores ELO depuis l'historique (toutes saisons)
npx tsx scripts/recompute-elo.ts

# Recalculer l'historique ELO du tournoi live en cours uniquement
npx tsx scripts/live-elo.ts
```

Ces scripts CLI ont un équivalent accessible depuis l'app (rôle super) via les routes `/api/admin/recompute-elo` et `/api/admin/live-elo`.

---

## 🔐 Accès & authentification

L'application est réservée aux membres inscrits (inscription protégée par un code d'invitation). Un middleware (`proxy.ts`) redirige tout visiteur non connecté vers `/login`. Trois niveaux de rôle, vérifiés côté serveur via des fonctions RPC Supabase (`get_my_role`, `is_super`) :

Les comptes créés avec un pseudo (email synthétique `@pst.net`, pas de vraie boîte mail) peuvent réinitialiser leur mot de passe via `/reset-password`, vérifié par le même code d'invitation (voir `documents/architecture.md` §4d pour le compromis de sécurité accepté).

| Rôle | Accès |
|---|---|
| **membre** | Classement, tournois, stats, fiche joueur, vidéos, live (lecture) |
| **admin** | + Pilotage du tournoi en direct (`/live/(admin)`) : saisie des scores, poules, demies, finales |
| **super** | + Administration système (`/live/(super)`) : gestion des comptes, joueurs, équipes, réglages ELO, reset |

---

## 🚢 Déploiement

Le plus simple est de déployer sur [Vercel](https://vercel.com) — la plateforme des créateurs de Next.js.

```bash
npm run build
```

---

*Design & Code by eCoucou Digital Engine · 2026*
