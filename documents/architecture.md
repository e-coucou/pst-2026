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
│   ├── signup/page.tsx             (code d'invitation requis, RPC verify_invitation_code)
│   ├── reset-password/page.tsx     Reset mdp des comptes pseudo (@pst.net), voir §4d
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
│   ├── stats/page.tsx              Tableaux de bord (Recharts) : global/scores/joueurs/
│   │                                records/évolution/popularité (RPC get_popularity_stats)
│   ├── tournois/page.tsx           Liste des éditions passées
│   ├── tournois/[year]/page.tsx    Détail d'une édition (poules, finales, résultats)
│   ├── videos/page.tsx             Hub "Médiathèque" (3 pavés : Vidéos/Photos/Contribuez)
│   ├── videos/gallery/page.tsx     Galerie YouTube + remerciements (contenu d'origine)
│   ├── videos/photos/page.tsx      Galerie photo (vignettes signées, clic → version complète)
│   ├── videos/upload/page.tsx      Import photo (compression + conversion WebP côté client)
│   ├── share/page.tsx              Plein écran QR code d'invitation
│   └── render/                     3D de la résidence, voir §9
│       ├── page.tsx                 Maquette 3D publique
│       └── prive/                   Espace réservé (rôle super), voir §9
│           ├── layout.tsx            Garde d'accès via RPC is_super()
│           ├── page.tsx              Hub (Contacts / Documents / Codes)
│           ├── contacts/page.tsx     CRUD résidence_contacts (Conseil Syndical)
│           ├── documents/page.tsx    Bibliothèque PDF (bucket Storage résidence_documents)
│           └── codes/page.tsx        CRUD résidence_codes (portails, digicodes)
│
├── joueurs/[id]/page.tsx          Fiche joueur (Server Component, profil ELO complet)
│
├── live/                          Espace tournoi "en cours"
│   ├── page.tsx                    Vue publique du direct
│   ├── switch/page.tsx             Sélecteur d'accès rapide (admin/super)
│   ├── progression/page.tsx
│   ├── (admin)/                    Groupe protégé : rôle admin OU super
│   │   ├── layout.tsx               Garde d'accès via RPC get_my_role()
│   │   ├── admin/page.tsx           Panel de pilotage du tournoi — choix du format (classique/10_equipes/ronde)
│   │   ├── poules/page.tsx          Saisie des scores de poules (classique/10_equipes)
│   │   ├── ronde/page.tsx           Saisie ronde par ronde, système suisse (format ronde), voir §7
│   │   ├── demi/page.tsx            Saisie des demi-finales (format classique uniquement)
│   │   ├── finale/page.tsx          Saisie des finales (les 3 formats, réutilisée telle quelle pour ronde)
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
│       ├── todo/page.tsx            Visionneuse de todo.md (via /api/dev/todo)
│       ├── activity/page.tsx        Journal d'activité (filtrable par section du site)
│       └── online/page.tsx          "Qui est en ligne" (activité < 1h, auto-refresh 15s)
│
└── api/
    ├── admin/recompute-elo/route.ts   Recalcul complet de l'historique ELO (toutes saisons)
    ├── admin/live-elo/route.ts        Recalcul de l'historique ELO du tournoi live en cours
    ├── auth/reset-password/route.ts   Reset mdp comptes pseudo (client service-role), voir §4d
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
| `Stepper.tsx` (`RenderStepper`) | Frise de progression du tournoi, liste d'étapes pilotée par le prop `format` : `classique` (6 étapes, avec Demis), `10_equipes` (5, sans Demis), `ronde` (5, "Rondes" puis "Finales" au lieu de "Poules"/"Demis") |
| `PouleStandingsTable.tsx` | Tableau de classement de poule partagé (Rk/Équipe/J/V-D-N/Pour-Contre/Diff/Pts), réutilisé par `poules`/`finale`/`podium`/`live`/`tournois/[year]` via `utils/live-stats.ts#calculatePouleStandings` — un seul calcul/rendu au lieu de versions "mini" divergentes |
| `LiveDraftDraw.tsx` | Tirage des équipes "en direct" (`admin/page.tsx`, étape EQUIPES, `live_tournament.team_mode = 'live'`) : révèle les joueurs par paire en cliquant sur celui annoncé (aucune randomisation côté app), mode "Présélection P/T" (respecte les pools JOUEURS) ou "Rôles aléatoires" (pool unique, rôle alterné par position de tirage) |
| `FavoriStar.tsx` | Étoile affichée à côté du nom d'un joueur quand c'est le favori de l'utilisateur courant (`utils/favori.ts` côté serveur, `hooks/useFavoriId.ts` côté client) |
| `FavoriteButton.tsx` | Toggle "joueur favori" (Client Component isolé pour préserver le Server Component parent) |
| `MarkdownDisplay.tsx` | Rendu stylisé de contenu Markdown (react-markdown + typography PST) |
| `GlobalLoadingBar.tsx` | Barre rouge fine en haut de l'écran, pilotée par un compteur incrémenté/décrémenté via un `fetch` custom posé sur le client Supabase navigateur (`utils/supabase/client.ts`) — s'affiche automatiquement pendant toute requête, sans instrumenter chaque appel |
| `PageViewTracker.tsx` | Composant invisible monté dans `layout.tsx`, logue un `PAGE_VIEW` à chaque changement de route (`usePathname`/`useSearchParams`) |
| `PredictionModal.tsx` | Moteur de "prono IA" (probabiliste), voir §8. Variantes historiques (`-bayer`, `-cp1`, `-cp2`) supprimées (dead code confirmé, cf. `todo.md`) |
| `Logo.tsx` | Logo SVG (tour + boule + cochonnet). `Logo_anc.tsx` (version antérieure) supprimé (dead code confirmé) |

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

**Rôles** : `membre` (défaut après inscription) < `admin` < `super`. Le rôle est stocké côté `site_users` et exposé via les RPC `get_my_role()` / `is_super()` (contournent RLS pour la lecture du rôle courant). L'inscription email/mot de passe est protégée par un code d'invitation vérifié via le RPC `verify_invitation_code` (table `site_config`).

### c) Inscription Google OAuth — vérification serveur du code d'invitation
`proxy.ts` ne peut pas intervenir sur ce cas précis : au moment où il intercepte la requête `/auth/callback?code=...`, le compte Google n'existe pas encore (il est créé *pendant* l'exécution du Route Handler par `exchangeCodeForSession`). La protection vit donc entièrement dans `app/auth/callback/route.ts` :
1. Échange le code Google contre une session.
2. Détecte un tout premier login (`created_at === last_sign_in_at`, identiques uniquement à la création du compte).
3. Si c'est un nouveau compte, revérifie le code d'invitation **côté serveur** via un client `SUPABASE_SERVICE_ROLE_KEY` (le code est transmis dans l'URL de retour `redirectTo`, pas via `localStorage` qui n'est pas lisible par un Route Handler).
4. Code absent/invalide → le compte est supprimé (`site_users`, `session_logs`, `activity_logs` nettoyés manuellement avant `auth.admin.deleteUser`, en plus des `ON DELETE CASCADE` déjà en place côté ces tables — double sécurité si une future table référence `auth.users` sans cascade), la session est révoquée, redirection vers `/signup?error=invite_required`.

Le bouton Google de `/login` (qui ne transmet aucun code) est protégé par la même logique : toute création de compte qui y transiterait est rejetée exactement comme via `/signup`.

### d) Réinitialisation de mot de passe (comptes pseudo uniquement)
Les comptes créés via `/signup` (hors Google) utilisent un email **synthétique** `${nickname}@pst.net` — pas de vraie boîte mail, donc le flux Supabase standard (`resetPasswordForEmail`, lien par email) est inutilisable. `/reset-password` + `app/api/auth/reset-password/route.ts` proposent une alternative : le formulaire demande pseudo + code d'invitation + nouveau mot de passe ; la route (client `SUPABASE_SERVICE_ROLE_KEY`) revérifie le code via le même RPC `verify_invitation_code`, retrouve l'utilisateur via l'email déterministe (`auth.admin.listUsers` puis recherche par email — pas de filtre serveur disponible sur ce SDK, un seul appel large suffit vu la taille du club), et appelle `auth.admin.updateUserById`. Erreur générique commune (code invalide *ou* pseudo introuvable) pour ne pas laisser deviner les pseudos existants. Action tracée dans `session_logs` (`PASSWORD_RESET`).

> ⚠️ **Le code d'invitation est un secret unique partagé par tous les membres.** L'utiliser comme seule vérification de reset signifie que n'importe quel membre le connaissant peut réinitialiser le mot de passe d'un autre membre s'il connaît son pseudo (contrairement à l'inscription, où le code n'autorise qu'à créer un compte pour soi-même). Risque documenté et accepté vu le contexte (club fermé) — voir `todo.md` (section Sécurité).

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
- **`live_tournament`** — ligne unique (`id=1`) avec `status` = étape courante du stepper, `format` (`classique`/`10_equipes`/`ronde`, voir §7), `team_mode` (`auto`/`live`, voir §7 — indépendant du format)
- **`live_teams`** — doublettes du jour : `elo_start_pointeur`, `elo_start_tireur`, `modern_start`, `poule` (`Gassin`/`Ramatuelle`, ou `Ronde` en format suisse — CHECK constraint étendue en conséquence)
- **`live_matches`** — match du jour : `team1_id`, `team2_id`, `score_team1/2`, `status` (`EN_COURS`/`TERMINE`), `type`, `poule`, `round` (entier, uniquement renseigné en format `ronde` pour distinguer les 4 rondes suisses), `delta_elo_team1/2`, `delta_modern_team1/2` — `type` porte une **FK vers `steps.id`** (non documentée par Supabase, découverte en pratique)
- **`live_selected`** — joueurs convoqués pour la journée, avec `role` (`Pointeur`/`Tireur`), ELO figé au moment de la sélection
- **`live_history`** — équivalent de `history_all` mais pour le tournoi live (reconstruit par `/api/admin/live-elo`)
- **`steps`** — barème par `type` de match : `value` (rang de base pour `finalTop8`, ex. `Finale Rang1` → 1), `label` (libellé lisible affiché à la place du `type` brut, ex. `Finale Rang2` → "Petite Finale")

### Résidence (espace réservé, voir §9)
- **`residence_contacts`** — coordonnées (`nom`, `telephone`, `email`), `category` (`conseil_syndical`/`gardien`/`coproprietaire`/`locataire`/`fournisseur`, typée côté UI mais stockée en `text` libre côté base), `contrat` (texte libre décrivant la prestation/référence contractuelle, affiché sous le nom — utilisé pour `fournisseur`, formulaire d'ajout conditionnel à cette catégorie), `apartment_num` (lien manuel optionnel vers `data/residence.ts`, exploité par la fiche double-clic de la scène 3D — voir §9), `access_level` (défaut `'super'`, prévu pour une extension "membre privilégié" future sans migration)
- **`residence_documents`** — métadonnées des PDF (`title`, `description`, `storage_path`, `file_size`, `mime_type`, `uploaded_by`), le binaire vit dans le bucket Storage `residence_documents`
- **`residence_codes`** — `label`/`code`/`notes` (portails, digicodes)
- RLS des 3 tables : `for all using (is_super())` — aucun accès `membre`/`admin` pour l'instant.

### Configuration
- **`settings`** — paramètres du moteur ELO (`elo_init`, `bonus_point`, `bonus_seuil`, `seuil`, `max_ecart`, `poids_finale`, `poids_finaliste`, `k_factor`) — voir §6

### Traçabilité (`activity_logs`)
- **`activity_logs`** — `user_id`, `nickname`, `action_type`, `metadata` (jsonb), `created_at`. Alimentée par `utils/log-activity.ts#logActivity()`, appelée :
  - automatiquement à chaque changement de route (`PAGE_VIEW`, via `components/PageViewTracker.tsx`, monté une fois dans `app/layout.tsx`) ;
  - explicitement sur les actions admin live (`ADMIN_SELECT_PLAYER`, `ADMIN_SAVE_SCORE`, etc.), les favoris (`FAVORITE_SET/UNSET`) et les photos (`PHOTO_UPLOAD`, `PHOTO_VIEW`).
  - `logActivity` lit le rôle de l'appelant (`site_users.role`, mis en cache par session d'onglet) et **n'enregistre rien pour le rôle `super`**.
  - RLS : `INSERT` ouvert à `authenticated` (chacun logue sa propre activité), `SELECT` réservé à `admin`/`super`.
  - Exploitée par `/live/(super)/activity` (journal filtrable par section), `/live/(super)/online` (agrégation JS du plus récent événement par utilisateur sur la dernière heure) et l'onglet "Popularité" de `/stats`.
  - RPC `get_popularity_stats()` (`SECURITY DEFINER`) : agrège `activity_logs` côté base (page/joueur/tournoi/photo les plus consultés) et ne renvoie que l'agrégat — ouverte à `authenticated`, contourne volontairement le RLS restrictif de la table pour ne pas exposer les lignes individuelles.

### Fonctions RPC utilisées côté client
`get_my_role`, `is_super`, `get_full_live`, `get_full_timeline`, `get_player_elo`, `get_player_stats`, `verify_invitation_code`, `get_popularity_stats`

### Storage
- Bucket `joueurs_photos` — accès via URL signée (1h) dans `app/joueurs/[id]/page.tsx` et `admin_joueurs/page.tsx`.
- Bucket `residence_documents` (privé) — PDF de la résidence, voir §9. Accès via URL signée (1h), policy `storage.objects` restreinte à `is_super()`.
- Bucket `photos_import` (privé) — contributions photo des membres. RLS exige que le chemin commence par `private/` (`(storage.foldername(name))[1] = 'private'`). Deux sous-dossiers par photo, même nom de fichier (`{userId}_{timestamp}.webp`) :
  - `private/full/` — jusqu'à ~1,5 Mo (compression + conversion WebP côté navigateur, `browser-image-compression`, plusieurs paliers résolution/qualité).
  - `private/thumbs/` — vignette 400px (~quelques dizaines de Ko), seule chargée par la galerie ; la version complète n'est signée et ouverte qu'au clic.
  - Le fichier `.emptyFolderPlaceholder` que Supabase crée pour un dossier vide est filtré côté client (ce n'est pas une photo).

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

## 7. Machine à états du tournoi live — 3 formats

Toutes les pages `live/*` partagent le même vocabulaire de statut, stocké dans `live_tournament.status`, choisi une fois pour toutes à l'étape `JOUEURS` via `live_tournament.format` (verrouillé dès qu'on avance) :

```
JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE
```

Les 3 formats empruntent des chemins différents dans cette même machine à états (aucun nouveau statut introduit — seules certaines étapes sont sautées ou réinterprétées) :

| Format | Équipes | Chemin | Détail |
|---|---|---|---|
| `classique` | 8 (2 poules de 4) | `POULES → DEMI → FINALE` | Round-robin par poule, demies (Principal/Honneur), 4 finales spécifiques (`Finale`, `Petite Finale`, `Toute petite Finale`, `Finale d'Honneur`) |
| `10_equipes` | 10 (2 poules de 5) | `POULES → FINALE` (saute `DEMI`) | Round-robin par poule, puis 5 finales classées 1er×1er…5e×5e (`Finale Rang1`…`Rang5`) directement depuis `poules/page.tsx` |
| `ronde` | 10 (1 seul groupe) | `POULES → FINALE` (saute `DEMI`) | Système suisse (voir `documents/rondes.md`) : 4 rondes générées une par une sur `/live/ronde` (appariement par classement cumulé, anti-rematch), puis une 5ème ronde = 5 finales classées par rang adjacent (1v2, 3v4…), réutilisant le même mécanisme `Finale RangX` que `10_equipes` — `finale/page.tsx` et `podium/page.tsx` sont donc réutilisées telles quelles, sans branche de code dédiée |

`generateRoundRobinPairs(n)` (`admin/page.tsx`) génère le round-robin de façon générique (méthode du cercle, avec bye si impair) pour `classique`/`10_equipes`. `generateRondePairing`/`buildPlayedPairs` (`utils/live-stats.ts`) gèrent l'appariement suisse du format `ronde`.

`components/Stepper.tsx` affiche visuellement la progression, sa liste d'étapes dépend du prop `format` (cf. §3). Chaque page conditionne l'affichage de ses sections à l'étape courante — soit via l'index du statut (`currentStepIndex >= statusSteps.findIndex(...)`), soit, de façon plus robuste et indépendante du format, en testant directement la présence de données (`demiMatches.length > 0`, `matches.length > 0` pour la section "Finales").

### Constitution des équipes : `team_mode` (orthogonal au format)
Indépendamment du format choisi, `live_tournament.team_mode` (`'auto'` | `'live'`) contrôle *comment* les paires pointeur/tireur sont formées à l'étape EQUIPES, dans `admin/page.tsx` :
- `'auto'` — mélange instantané historique (`handleInitialShuffle`), résultat modifiable ensuite via les flèches de réordonnancement.
- `'live'` — tirage révélé pair par pair via `components/LiveDraftDraw.tsx` : le tirage au sort a lieu physiquement hors de l'app (boules, tombola), qui se contente d'enregistrer le joueur cliqué (aucune randomisation côté client). Deux sous-modes choisis dans le composant : "Présélection P/T" (respecte les pools Pointeurs/Tireurs constitués à l'étape JOUEURS) ou "Rôles aléatoires" (ignore cette présélection, pool unique, le rôle alterne automatiquement selon la position de tirage — un seul réglage global "les impairs sont Tireurs/Pointeurs" fixé une fois).

Un bouton "↔" sur l'aperçu des équipes (les deux modes) permet d'inverser après coup les rôles P/T d'une paire déjà formée (`swapRoles`). Le bouton "Lancement du Tournoi" est bloqué tant que le draft n'est pas complet (`draftP.length === requiredCount / 2`), pour éviter un lancement prématuré en mode `'live'`.

## 8. Module de prédiction IA (`PredictionModal.tsx`)

Un bouton "IA Prono" sur chaque match non terminé ouvre une modale qui calcule une probabilité de victoire **côté client**, sans appel à un LLM :

1. Récupère par joueur : dernier ELO Modern (`elo_history`), variance des scores marqués sur les 15 derniers matchs (**explosivité**), et écart de score moyen sur les matchs du jour (**bonus de forme**, plafonné et atténué si peu de matchs).
2. `μ_équipe` = moyenne des `μ` des 2 joueurs ; `σ_total = √(2 × 150²)` (volatilité fixe, calibrage documenté comme approximatif dans le code).
3. Probabilité de victoire via CDF de loi normale (approximation `erf` d'Abramowitz & Stegun).
4. Score prédit dérivé d'un "ratio de domination" linéaire, avec logique différente pour un match de **Poule** (temps limité, score de nul possible) vs **éliminatoire** (première équipe à 13).
5. Un indice de confiance combine 4 facteurs pondérés (profondeur d'historique, qualité de l'explosivité, fiabilité du bonus de forme, netteté de la probabilité), plafonné à 98%.

> Le fichier contient volontairement des commentaires "À CALIBRER" — les constantes de `PREDICTION_CONFIG` sont des hypothèses de départ, pas des valeurs validées statistiquement.

## 9. Modélisation 3D de la résidence (`data/residence.ts`, `app/(sections)/render/page.tsx`)

`data/residence.ts` encode le plan du bâtiment de la résidence sous forme de grille paramétrique (sections `principale`/`sectionB`, colonnes/rangées, appartements avec `col`/`row`/`colSpan`/`rowSpan`/`face`, occupants relevés sur les plans) accompagnée de formules de dérivation 3D destinées à un rendu React Three Fiber.

`app/(sections)/render/page.tsx` est une scène Three.js/React Three Fiber fonctionnelle et significativement développée : rendu de tous les appartements (avec quirks architecturaux gérés au cas par cas — largeurs débordantes, extensions en L, couloirs absorbés — via des champs d'override sur chaque appartement), sélection interactive au double-clic avec panneau d'info, boussole/`GizmoHelper` d'orientation, piscine + pataugeoire modélisées par extrusion (dimensions mesurées sur une photo aérienne réelle), terrain de pétanque avec joueurs et nageurs stylisés low-poly.

### Espace réservé (`app/(sections)/render/prive/`, rôle `super`)

Sous-arbre gardé par un `layout.tsx` dédié (même principe que `live/(super)/layout.tsx` : RPC `is_super()`, redirect vers `/render` sinon — dupliqué plutôt que partagé car `/render` n'est pas sous l'arborescence `/live`). Accessible depuis `/render` via un bouton "Accès réservé" affiché uniquement si `userRole === 'super'` (état déjà présent dans la page, alimenté par `get_my_role`).

Page hub (3 tuiles, gabarit repris de `/videos`) vers :
- **`contacts/`** — coordonnées (`residence_contacts`), CRUD inline, 5 catégories filtrables par pills (Conseil Syndical, Gardien, Copropriétaire, Locataire, Fournisseur — badge coloré par catégorie), `apartment_num` affiché en badge quand renseigné. Téléphone/email sont des liens `tel:`/`mailto:` (ouvrent directement l'app Téléphone/Mail sur iPhone). Catégorie `fournisseur` : champ `contrat` additionnel (prestation/référence), affiché en sous-ligne du nom, formulaire d'ajout conditionnel à cette catégorie.

Sur la scène 3D publique (`render/page.tsx`), la fiche d'un appartement sélectionné par double-clic affiche désormais, **en mode `super` uniquement**, le téléphone/email du contact `residence_contacts` dont `apartment_num` correspond (chargés une fois en mémoire au montage si `role === 'super'`, mappés par n° d'appartement). Le gizmo de coordonnées XYZ (hover, mode super) est masqué pour l'instant côté UI — la mécanique de hover (`CoordinateProbe`) reste en place, prête à être réaffichée.
- **`documents/`** — bibliothèque de PDF (convocations, comptes-rendus...), upload vers le bucket privé `residence_documents` + métadonnées en base, téléchargement par URL signée, suppression (fichier + ligne).
- **`codes/`** — codes d'accès (portails, digicodes) avec bouton copier.

Les 3 tables portent une colonne `access_level` (défaut `'super'`) pour permettre plus tard d'élargir l'accès à des "membres privilégiés" sans migration de schéma — aucune UI côté membre n'existe pour l'instant.

Les 6 premiers contacts du Conseil Syndical proviennent d'un extrait de `documents/private/Extranet Reveille.pdf` (export de l'extranet du syndic), saisis manuellement en base (le fichier PDF lui-même n'est pas importé dans le bucket, seules les infos structurées le sont).

## 10. Déploiement & configuration

- **Cible** : Vercel (`npm run build`).
- **Variables d'environnement** (`.env.local`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (utilisée uniquement côté serveur dans les routes `/api/admin/*`, jamais exposée au client).
- **`next.config.js`** injecte `APP_VERSION` (depuis `package.json`) dans l'environnement, affiché par `Footer.tsx` avec le SHA du commit Vercel (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`).
- **PWA** : `app/manifest.ts` déclare l'app comme installable (`standalone`, thème rouge `#e31e24`).

## 11. Dette technique observée

- `lib/auth-actions.ts` (`verifyInvitationCode`, `isAdmin`) n'est importé nulle part — remplacé respectivement par le RPC `verify_invitation_code` (appelé directement) et par `get_my_role`/`is_super`. Conservé volontairement en attendant une revérification de sécurité avant suppression (cf. `todo.md`).
- Deux configurations Tailwind qui ne correspondent plus au thème réellement appliqué : `tailwind.config.ts` (racine, style v3, quasiment vide) et `files/tailwind.config.ts` (variante commentée avec palette `pst-*`) — le thème réel vit dans `app/globals.css` via `@theme` (Tailwind v4). Voir `design-system.md` §"Écart entre doc et implémentation".
- `migration-pst.ts` (racine) contient du code Python, pas du TypeScript — fichier probablement mal nommé ou déplacé par erreur.
- Pas de schéma SQL versionné (migrations Supabase) dans le dépôt — le modèle de données du §5 est déduit du code applicatif, pas d'une source canonique. Les RPC/policies créées pendant cette session (`get_popularity_stats`, policies RLS de `activity_logs` et `photos_import`) ne sont pas non plus versionnées.
- **Piège rencontré plusieurs fois** : un `select(...)` ciblant une colonne pas encore créée en base (ex. `team_mode` avant sa migration) échoue silencieusement si le code ne vérifie pas `error` — `data` devient `null` et le code retombe sur ses valeurs par défaut (`format: 'classique'`) sans rien signaler, ce qui ressemble à un bug fonctionnel alors que c'est un schéma désynchronisé. Corrigé pour cette requête précise dans `admin/page.tsx` (affiche une alerte si `error`) ; à garder en tête pour toute nouvelle colonne ajoutée manuellement en base avant que le code qui la lit ne soit déployé.
- `app/(sections)/videos/photos/page.tsx` liste les photos dans `private/thumbs/` : les photos uploadées **avant** l'introduction du système vignette+complet (chemin plat `private/{fichier}.webp`, sans sous-dossier) ne sont plus listées — pas de code de migration/rétrocompatibilité.
- `documents/private/` contient des données personnelles/financières réelles (convocation d'AG, rapprochement nom/lot du Bâtiment B) — ajouté à `.gitignore`, jamais commité, à traiter avec précaution.
