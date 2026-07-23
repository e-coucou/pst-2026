# Architecture — PST 2026

> Document technique décrivant l'architecture réelle du code tel qu'il existe dans le dépôt. Pour le langage visuel (couleurs, typo, composants UI), voir [`design-system.md`](./design-system.md).

---

## 1. Vue d'ensemble

PST 2026 est une application web privée de gestion de tournoi de pétanque (classement ELO, suivi live, archives, vidéos) construite avec :

| Domaine | Techno |
|---|---|
| Framework | **Next.js 16** (App Router, Server + Client Components) |
| UI | **React 19**, Tailwind CSS v4, Lucide Icons |
| Backend / DB | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| Graphiques | Recharts |
| 3D | Three.js / React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Langage | TypeScript |
| Déploiement cible | Vercel |

> ⚠️ **Next.js 16** introduit des changements par rapport aux versions antérieures (voir `AGENTS.md` à la racine : la doc locale à jour se trouve dans `node_modules/next/dist/docs/`). Le fichier middleware s'appelle ici `proxy.ts` (export `proxy`), pas `middleware.ts`.

---

## 2. Arborescence applicative (App Router)

```
app/
├── layout.tsx                     Layout racine : <Navbar/> + <main/> + <Footer/>
├── page.tsx                       Accueil (hero, compteur joueurs, accès rapide)
├── globals.css                    Thème Tailwind v4 (@theme, couleurs de base)
├── manifest.ts                    PWA manifest
│
├── (acces)/                       Groupe de routes — authentification
│   ├── login/page.tsx
│   ├── signup/page.tsx             (code d'invitation requis, cf. lib/auth-actions.ts)
│   └── logout/page.tsx
│
├── auth/callback/route.ts         Callback OAuth/Magic Link Supabase
│
├── (sections)/                    Groupe de routes — contenu public "vitrine"
│   ├── about/page.tsx              L'esprit du tournoi
│   ├── concept/page.tsx            Règlement officiel (poules, tirage, fondateurs)
│   ├── regles-elo/page.tsx         Explication pédagogique des 2 algorithmes ELO
│   ├── classement/page.tsx         Leaderboard ELO (Classic + Modern)
│   ├── classement/progression/page.tsx   Courbe de progression multi-joueurs
│   ├── stats/page.tsx              Tableaux de bord statistiques (Recharts)
│   ├── tournois/page.tsx           Liste des éditions passées
│   ├── tournois/[year]/page.tsx    Détail d'une édition (poules, finales, résultats)
│   ├── videos/page.tsx             Zone membres — replays YouTube embarqués
│   ├── share/page.tsx              Plein écran QR code d'invitation
│   └── render/page.tsx             3D de la résidence (⚠️ voir §9 Known Issues)
│
├── joueurs/[id]/page.tsx          Fiche joueur (Server Component, profil ELO complet)
│
├── live/                          Espace tournoi "en cours"
│   ├── page.tsx                    Vue publique du direct
│   ├── switch/page.tsx             Sélecteur d'accès rapide (admin/super)
│   ├── progression/page.tsx
│   ├── (admin)/                    Groupe protégé : rôle admin OU super
│   │   ├── layout.tsx               Garde d'accès via RPC get_my_role()
│   │   ├── admin/page.tsx           Panel de pilotage du tournoi
│   │   ├── poules/page.tsx          Saisie des scores de poules
│   │   ├── demi/page.tsx            Saisie des demi-finales
│   │   ├── finale/page.tsx          Saisie des finales
│   │   └── podium/page.tsx          Palmarès final (classement, historique, graph)
│   └── (super)/                    Groupe protégé : rôle super uniquement
│       ├── layout.tsx               Garde d'accès via RPC is_super()
│       ├── super/page.tsx           Panel super admin (maintenance, navigation)
│       ├── users/page.tsx           Gestion des comptes (site_users)
│       ├── admin_joueurs/page.tsx   CRUD joueurs (profiles)
│       ├── admin_teams/page.tsx     CRUD équipes / doublettes
│       ├── params_elo/page.tsx      Réglages du moteur ELO (table settings)
│       ├── reset/page.tsx           Reset du tournoi live
│       ├── charte/page.tsx          Visionneuse de charte.md (via /api/dev/charte)
│       └── todo/page.tsx            Visionneuse de todo.md (via /api/dev/todo)
│
└── api/
    ├── admin/recompute-elo/route.ts   Recalcul complet de l'historique ELO (toutes saisons)
    ├── admin/live-elo/route.ts        Recalcul de l'historique ELO du tournoi live en cours
    └── dev/charte/, dev/todo/route.ts Lecture de fichiers .md locaux (debug/admin)
```

**Route groups** : `(acces)` et `(sections)` n'affectent pas l'URL — ils servent uniquement à organiser le code. `(admin)` et `(super)` dans `live/` fonctionnent pareil côté routing, mais chacun porte un `layout.tsx` qui agit comme **garde d'accès** (voir §4).

---

## 3. Composants partagés (`/components`)

| Composant | Rôle |
|---|---|
| `Navbar.tsx` | Nav sticky, détecte le rôle (`membre`/`admin`/`super`) via `supabase.rpc('get_my_role')`, affiche icônes et accès contextuels, écoute `onAuthStateChange` |
| `Footer.tsx` | Version de build (`APP_VERSION` + SHA Vercel), lien QR (`/share`) |
| `EloChart.tsx` | Courbe ELO d'un joueur (Recharts), bascule Classic/Modern, marqueurs par saison |
| `GlobalProgressionChart.tsx` | Courbe multi-joueurs (jusqu'à ~31 lignes colorées en HSL), tooltip Top 16 |
| `SeasonHistory.tsx` | Accordéon historique saison par saison avec détail des matchs |
| `StatsCard.tsx` | Tuile de statistique générique (label/valeur/couleur) |
| `Stepper.tsx` (`RenderStepper`) | Frise de progression du tournoi (`JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE`) |
| `AdminSettings.tsx` | Déclenche `/api/admin/recompute-elo` |
| `FavoriteButton.tsx` | Toggle "joueur favori" (Client Component isolé pour préserver le Server Component parent) |
| `MarkdownDisplay.tsx` | Rendu stylisé de contenu Markdown (react-markdown + typography PST) |
| `PredictionModal*.tsx` | Moteur de "prono IA" (probabiliste), voir §7. Plusieurs variantes historiques (`-bayer`, `-cp1`, `-cp2`) coexistent dans le dépôt à côté de la version active `PredictionModal.tsx` |
| `Logo.tsx` / `Logo_anc.tsx` | Logo SVG (tour + boule + cochonnet). `Logo_anc.tsx` est une version antérieure conservée |

---

## 4. Authentification & autorisation

Deux couches complémentaires :

### a) `proxy.ts` (middleware Next.js 16)
- Ignore les assets statiques et `/api/*`.
- Rafraîchit la session Supabase via `@supabase/ssr` (cookies).
- Redirige vers `/login` tout visiteur non authentifié sur une route non publique (`publicRoutes = ['/', '/login', '/signup', '/auth/callback']`).

### b) Garde de rôle par `layout.tsx`
Chaque zone sensible embarque son propre layout serveur qui interroge des fonctions RPC Postgres :

```mermaid
flowchart TD
    A[Requête] --> B{proxy.ts}
    B -- non connecté --> L[/login]
    B -- connecté --> C[Route demandée]
    C --> D{Dans live/(admin) ?}
    D -- oui --> E["rpc get_my_role()"]
    E -- role ∉ [admin, super] --> R1[/live]
    E -- ok --> F[Page admin]
    C --> G{Dans live/(super) ?}
    G -- oui --> H["rpc is_super()"]
    H -- false --> R2[/]
    H -- true --> I[Page super]
```

**Rôles** : `membre` (défaut après inscription) < `admin` < `super`. Le rôle est stocké côté `site_users` et exposé via les RPC `get_my_role()` / `is_super()` (contournent RLS pour la lecture du rôle courant). L'inscription est protégée par un code d'invitation vérifié via `verifyInvitationCode()` (`lib/auth-actions.ts`, table `site_config`).

---

## 5. Modèle de données (Supabase / PostgreSQL)

Aucun fichier de schéma SQL n'est versionné dans le dépôt — le schéma ci-dessous est **reconstruit par lecture du code** (requêtes `.from(...)`). À vérifier/exporter depuis le dashboard Supabase si un schéma faisant autorité est nécessaire.

### Identité & comptes
- **`profiles`** — fiche joueur : `id`, `nom`, `photo_url`, `level`, relation `elo_history`
- **`site_users`** — compte applicatif : `id` (= auth uid), `role` (`membre`/`admin`/`super`), `favoris` (FK → `profiles.id`)
- **`site_config`** — clé/valeur (ex. `invitation_code`)
- **`session_logs`** — journal des connexions/déconnexions

### Historique (saisons archivées)
- **`seasons`** — `year`, `is_active`
- **`teams`** — doublette d'une saison passée : `tireur_id`, `pointeur_id`
- **`games`** — match archivé : `team_1_id`, `team_2_id`, `score_1`, `score_2`, `type` (`Poule`/`Demi`/`Finale`), `year`, `poule`
- **`elo_history`** — un enregistrement par joueur par match : `elo_value`, `elo_modern_value`, `rank_at_time`, `sc_p`/`sc_c`, adversaires, etc. — reconstruite intégralement par `/api/admin/recompute-elo`
- **`history_all`** — même chronologie mais **tous les joueurs à chaque match** (sert aux graphes globaux `GlobalProgressionChart`)

### Tournoi en direct (saison courante)
- **`live_tournament`** — ligne unique (`id=1`) avec `status` = étape courante du stepper
- **`live_teams`** — doublettes du jour : `elo_start_pointeur`, `elo_start_tireur`, `modern_start`, `poule`
- **`live_matches`** — match du jour : `team1_id`, `team2_id`, `score_team1/2`, `status` (`EN_COURS`/`TERMINE`), `type`, `delta_elo_team1/2`, `delta_modern_team1/2`
- **`live_selected`** — joueurs convoqués pour la journée, avec `role` (`Pointeur`/`Tireur`), ELO figé au moment de la sélection
- **`live_history`** — équivalent de `history_all` mais pour le tournoi live (reconstruit par `/api/admin/live-elo`)
- **`steps`** — barème de points (rang) par `type` de match (finale, demi, etc.)

### Configuration
- **`settings`** — paramètres du moteur ELO (`elo_init`, `bonus_point`, `bonus_seuil`, `seuil`, `max_ecart`, `poids_finale`, `poids_finaliste`, `k_factor`) — voir §6

### Fonctions RPC utilisées côté client
`get_my_role`, `is_super`, `get_full_live`, `get_full_timeline`, `get_player_elo`, `get_player_stats`

### Storage
Bucket `joueurs_photos` — accès via URL signée (1h) dans `app/joueurs/[id]/page.tsx`.

### Realtime
Le podium live (`live/(admin)/podium/page.tsx`) s'abonne à un channel Supabase Realtime sur `live_matches`, `live_tournament`, `live_selected`, `live_teams` (`postgres_changes`) pour rafraîchir l'UI sans polling.

---

## 6. Moteur ELO (`lib/elo-engine.ts`, `utils/elo-logic.ts`)

Deux algorithmes coexistent et sont calculés **en parallèle** sur chaque match, chacun alimentant sa propre colonne (`elo_value` / `elo_modern_value`) :

### PST Classic (inspirée du rugby IRB)
```ts
D = clamp(elo1 - elo2, ±max_ecart)
multiplier = poids_finale | poids_finaliste | 1.0   // selon le type de match
if |score1 - score2| > bonus_seuil: multiplier *= bonus_point
gain = (±1 - D/seuil) * multiplier                  // signe selon le vainqueur
```

### Modern ELO (FIDE / probabiliste)
```ts
expected1 = 1 / (1 + 10^((elo2 - elo1)/400))
gain = k_factor * (résultat_réel - expected1)
```

Les réglages (`EloSettings`) sont stockés en base (table `settings`) et parsés via `parseSettings()`. Trois points d'entrée recalculent l'historique :

1. **`/api/admin/recompute-elo`** — rejoue **toute** la table `games` (toutes saisons), reconstruit `elo_history` + `history_all` depuis `elo_init` pour chaque joueur.
2. **`/api/admin/live-elo`** — rejoue uniquement `live_matches` (saison en cours), part des ELO figés dans `live_teams.elo_start_*`, reconstruit `live_history`.
3. **`utils/elo-logic.ts#updateMatchScore`** — appelé à la saisie d'un score en live : calcule le delta du match et met à jour `live_matches` (`delta_elo_team1/2`, `delta_modern_team1/2`) sans rejouer tout l'historique.

`utils/live-stats.ts#calculateTeamsStats` agrège ensuite les deltas de matchs terminés pour afficher la progression ELO cumulée d'une équipe (utilisé par le podium).

---

## 7. Machine à états du tournoi live

Toutes les pages `live/*` partagent le même vocabulaire de statut, stocké dans `live_tournament.status` :

```
JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE
```

`components/Stepper.tsx` affiche visuellement la progression ; chaque page conditionne l'affichage de ses sections à `currentStepIndex >= statusSteps.findIndex(...)` pour ne montrer que ce qui est pertinent à l'étape courante (ex : le classement final n'apparaît qu'à `TERMINE`).

## 8. Module de prédiction IA (`PredictionModal.tsx`)

Un bouton "IA Prono" sur chaque match non terminé ouvre une modale qui calcule une probabilité de victoire **côté client**, sans appel à un LLM :

1. Récupère par joueur : dernier ELO Modern (`elo_history`), variance des scores marqués sur les 15 derniers matchs (**explosivité**), et écart de score moyen sur les matchs du jour (**bonus de forme**, plafonné et atténué si peu de matchs).
2. `μ_équipe` = moyenne des `μ` des 2 joueurs ; `σ_total = √(2 × 150²)` (volatilité fixe, calibrage documenté comme approximatif dans le code).
3. Probabilité de victoire via CDF de loi normale (approximation `erf` d'Abramowitz & Stegun).
4. Score prédit dérivé d'un "ratio de domination" linéaire, avec logique différente pour un match de **Poule** (temps limité, score de nul possible) vs **éliminatoire** (première équipe à 13).
5. Un indice de confiance combine 4 facteurs pondérés (profondeur d'historique, qualité de l'explosivité, fiabilité du bonus de forme, netteté de la probabilité), plafonné à 98%.

> Le fichier contient volontairement des commentaires "À CALIBRER" — les constantes de `PREDICTION_CONFIG` sont des hypothèses de départ, pas des valeurs validées statistiquement.

## 9. Modélisation 3D de la résidence (`data/residence.ts`, `app/(sections)/render/page.tsx`)

`data/residence.ts` encode le plan du bâtiment de la résidence sous forme de grille paramétrique (sections, colonnes/rangées, appartements avec `col`/`row`/`colSpan`/`rowSpan`/`face`) accompagnée de formules de dérivation 3D (`derivedFormulas`) destinées à un rendu React Three Fiber (position/dimensions de chaque volume dans une scène Three.js).

> ⚠️ **Known issue** : au moment de cette analyse, `app/(sections)/render/page.tsx` (modifié, non committé) ne contient **pas** de composant Next.js/Three.js mais un script Python (`argparse`, imports `l_productions_report`/`ProductionOptimiseClient`) — identique au contenu erroné trouvé dans `migration-pst.ts` à la racine. La page de rendu 3D est donc actuellement non fonctionnelle. Il s'agit probablement d'un copier-coller malencontreux entre deux fichiers de travail ; à corriger avant de committer (voir git status : les deux fichiers `app/(sections)/render/page.tsx` et `data/residence.ts` sont modifiés et non commit).

## 10. Déploiement & configuration

- **Cible** : Vercel (`npm run build`).
- **Variables d'environnement** (`.env.local`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (utilisée uniquement côté serveur dans les routes `/api/admin/*`, jamais exposée au client).
- **`next.config.js`** injecte `APP_VERSION` (depuis `package.json`) dans l'environnement, affiché par `Footer.tsx` avec le SHA du commit Vercel (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`).
- **PWA** : `app/manifest.ts` déclare l'app comme installable (`standalone`, thème rouge `#e31e24`).

## 11. Dette technique observée

- Doublons de composants non nettoyés : `PredictionModal-bayer.tsx`, `PredictionModal-cp1.tsx`, `PredictionModal-cp2.tsx` à côté de `PredictionModal.tsx` actif ; `Logo_anc.tsx` à côté de `Logo.tsx`.
- Deux configurations Tailwind qui ne correspondent plus au thème réellement appliqué : `tailwind.config.ts` (racine, style v3, quasiment vide) et `files/tailwind.config.ts` (variante commentée avec palette `pst-*`) — le thème réel vit dans `app/globals.css` via `@theme` (Tailwind v4). Voir `design-system.md` §"Écart entre doc et implémentation".
- `migration-pst.ts` (racine) contient du code Python, pas du TypeScript — fichier probablement mal nommé ou déplacé par erreur.
- `app/(sections)/render/page.tsx` est actuellement cassé (§9).
- Pas de schéma SQL versionné (migrations Supabase) dans le dépôt — le modèle de données du §5 est déduit du code applicatif, pas d'une source canonique.
- `todo.md` liste déjà plusieurs de ces points (bouton retour de la page charte, intégrité des schémas, dark mode dashboard admin, logs d'audit).
