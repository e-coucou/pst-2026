# Plan — Archivage de la saison live dans la base globale

**Statut global :** Plan uniquement, rien n'est implémenté. À valider avant de coder quoi que ce soit — ce document sert de base de discussion, pas de spec figée.

**Origine :** point déjà noté dans `documents/todo.md` (section "En cours") : *"À la fin du tournoi 2026, l'archivage de la saison (`teams`/`games`, page `tournois/[year]`) devra gérer le format utilisé — 3 formats coexistent désormais [...] les années auront des structures différentes selon le format choisi. Pas encore traité, à reprendre après la fin du tournoi 2026."* Egalement signalé comme "Hors scope" dans `documents/rondes.md` et `documents/plan_10_teams.md` au moment d'ajouter les formats `10_equipes`/`ronde`.

---

## 1. Contexte

Le tournoi "en direct" vit dans les tables `live_tournament`/`live_teams`/`live_matches`/`live_selected`/`live_history`. Une fois le podium affiché (`live_tournament.status = 'TERMINE'`), **rien dans le code actuel ne transfère ces données vers l'historique** (`teams`/`games`, qui alimentent `/tournois`, `/tournois/[year]`, `/classement`, `/stats`, les fiches joueurs, `SeasonHistory`, `EloChart`, `GlobalProgressionChart`). Le seul précédent est `migration-pst.ts` à la racine : un script one-shot (déjà exécuté, jamais rejoué) qui a importé un export JSON d'un ancien système vers ce schéma — utile ici comme **référence de mapping de champs**, mais pas comme pipeline réutilisable (il réinsère aussi `profiles`/`settings`, ce qui n'a plus de sens en cours de vie de l'app).

Aujourd'hui, `/live/(super)/reset` (RPC `reset_tournament`) **supprime définitivement** `live_matches`/`live_teams`/`live_selected` pour repartir sur une nouvelle saison — donc si l'archivage n'a pas lieu *avant* ce reset, les données de la saison sont perdues. C'est le risque numéro un de ce plan.

Deuxième complication, propre à cette année : la page d'archives (`tournois/[year]/page.tsx`) et la liste des éditions (`tournois/page.tsx`) sont **câblées en dur pour le format `classique`** (8 équipes, poules Gassin/Ramatuelle de 4, demis Principal/Honneur, 4 finales nommées). Les formats `10_equipes` et `ronde` (ajoutés cette saison, cf. `documents/plan_10_teams.md`/`documents/rondes.md`) produisent des données de forme différente. Il faut donc généraliser ces pages **avant** de pouvoir archiver une saison qui ne serait pas `classique` sans casser leur affichage.

---

## 2. Le mapping live → archive (déduit du code, pas d'un schéma versionné)

| Live (saison en cours) | Archive (historique) | Remarque |
|---|---|---|
| `live_teams.id` (une **lettre**, `'A'..'J'`) | `teams.id` (entier **auto-incrémenté**) | ⚠️ Point non-évident déjà documenté dans `components/PouleStandingsTable.tsx` (`isTeamLetter`) : la lettre ne doit **pas** être réutilisée comme clé primaire de `teams`. |
| — | `teams.nom` | Reçoit la lettre (`live_teams.id`) — c'est elle qui est affichée comme "code équipe" sur les pages d'archives. |
| `live_teams.tireur_id` / `.pointeur_id` | `teams.tireur_id` / `.pointeur_id` | Copie directe (FK vers `profiles`, inchangées). |
| `live_matches.team1_id` / `.team2_id` (lettres) | `games.team_1_id` / `.team_2_id` (entiers) | Doivent être **traduits** via le dictionnaire lettre → nouvel id construit à l'étape précédente. |
| `live_matches.score_team1` / `.score_team2` | `games.score_1` / `.score_2` | Copie directe. |
| `live_matches.type` | `games.type` | Copie directe (`'Poule'`, `'Demi'`, `'Finale'`, `'Petite Finale'`, ..., `'Finale Rang1'`..`'Rang5'`). |
| `live_matches.poule` | `games.poule` | Copie directe (`'Gassin'`/`'Ramatuelle'`/`'Ronde'`/`''`). |
| `live_matches.tableau` | `games.tableau` | Existe déjà côté live pour `Demi`/`Finale` (classique). Absent/non pertinent pour `10_equipes`/`ronde` — `migration-pst.ts` comble ce cas par un défaut `'Principal'` (`m.tableau || 'Principal'`), à reproduire pour rester cohérent avec l'historique existant. |
| `live_tournament.format` | — (pas de colonne `format` sur `teams`/`games` aujourd'hui) | Voir §4 : proposition d'ajouter `format` sur `seasons` plutôt que sur chaque ligne de `games`. |
| `live_matches.id` | — | Ne **pas** réutiliser comme `games.id` : laisser l'auto-incrément de `games` faire son travail, comme pour `teams.id`. |

`live_selected` (joueurs convoqués + statut confirmé/payé) et `live_history`/`live_teams.elo_start_*` (suivi ELO *pendant* le direct) ne sont **pas archivés** — cohérent avec l'existant : `teams`/`games` n'ont jamais capturé cette information, même pour les saisons pré-2026. L'ELO historique (`elo_history`/`history_all`) est intégralement **recalculé** depuis `teams`+`games` par `/api/admin/recompute-elo` (voir §5) — pas de copie des deltas live.

---

## 3. Impact des 3 formats sur les données archivées

| | `classique` (existant) | `10_equipes` | `ronde` |
|---|---|---|---|
| Équipes | 8 | 10 | 10 |
| Poules | Gassin / Ramatuelle (4+4) | Gassin / Ramatuelle (5+5) | un seul groupe, `poule = 'Ronde'` |
| Demis | oui (`type='Demi'`, `tableau='Principal'/'Honneur'`) | **aucune** | **aucune** |
| Finales | 4, types fixes (`Finale`, `Petite Finale`, `Toute petite Finale`, `Finale d'Honneur`), `tableau='Principal'` | 5, types `Finale Rang1..5` | 5, types `Finale Rang1..5` (mécanisme identique à `10_equipes`) |
| "LA finale" (champion) | `type='Finale' AND tableau='Principal'` | `type='Finale Rang1'` | `type='Finale Rang1'` |

Toutes les saisons archivées à ce jour (pré-2026) sont vraisemblablement en format `classique` implicite — à confirmer, mais rien dans le code n'indique le contraire (`tournois/[year]/page.tsx` n'a jamais eu besoin de distinguer un format).

---

## 4. Modèle cible proposé : `seasons.format` + `seasons.is_archived`

Pour que le pipeline d'archivage **et** les pages d'affichage sachent quelle forme attendre sans deviner à partir des données, proposition d'ajouter une colonne `seasons.format text` (nullable, backfill `'classique'` sur les lignes existantes). Une seule ligne à lire par année, plutôt que d'inférer le format à partir de la présence de `poule='Ronde'` ou de `type='Finale Rang1'` dans `games` (fragile, et coûteux à recalculer à chaque affichage).

`seasons` est aujourd'hui **écrite nulle part dans le code applicatif** en dehors de `migration-pst.ts` (exécuté une fois, jamais rejoué) — probablement alimentée à la main depuis le dashboard Supabase depuis. **L'archivage sera donc la première écriture programmatique dans cette table.**

### `is_active` ne gate aucune donnée live — vérifié dans le code

Point clarifié après relecture précise : `seasons.is_active` n'est utilisé **que** pour un libellé d'année, à deux endroits (`app/page.tsx` → "Saison {year}", `podium/page.tsx` → "• été {year} •"), plus une lecture non exploitée dans `app/live/page.tsx`. **Rien** ne filtre le contenu de `/live` ou `/live/podium` par `seasons` — ces pages lisent `live_tournament`/`live_teams`/`live_matches` directement et sans condition. Donc à ce jour, il n'existe **aucun mécanisme qui "cache" un tournoi terminé** tant que `reset_tournament` n'a pas été lancé.

Le risque n'est donc pas dans l'état actuel du code, mais dans la conception de l'archivage : si on couplait le changement de `is_active` à l'action "archiver", on introduirait artificiellement l'incohérence (étiquette d'année qui change alors que les tables `live_*` affichées n'ont pas bougé). **Décision : découpler strictement les deux actions.**

### Nouveau champ `seasons.is_archived boolean default false`

Indépendant de `is_active`. Indique que les données de cette saison ont été copiées dans `teams`/`games` — ne dit rien sur si elle est "la saison courante".

### Cycle de vie d'une saison (3 états, 2 actions distinctes du super)

```
┌─────────────────────┐   Archiver   ┌─────────────────────┐  Passer à la saison   ┌─────────────────────┐
│ EN COURS             │ ───────────▶ │ ARCHIVÉE, encore     │ ────suivante─────────▶│ Nouvelle saison      │
│ is_active=true       │              │ affichée en live     │  (super, explicite)   │ EN COURS             │
│ is_archived=false    │              │ is_active=true       │                        │ is_active=true       │
│ (année N)            │              │ is_archived=true     │                        │ is_archived=false    │
│                      │              │ (année N)            │                        │ (année N+1)          │
└─────────────────────┘              └─────────────────────┘                        └─────────────────────┘
```

- **Action 1 — "Archiver le tournoi"** (§5) : copie `live_*` → `teams`/`games`, recalcule l'ELO, marque `seasons.<N>.is_archived = true`. **Ne touche ni `is_active`, ni les tables `live_*`.** Conséquence directe : `/live`, `/live/podium`, l'étiquette d'année sur l'accueil — tout continue d'afficher exactement ce qu'il affichait juste avant, sans aucune régression visible. La saison devient *en plus* consultable sur `/tournois/<N>`.
- **Action 2 — "Passer à la saison suivante"** (nouvelle, distincte de `reset_tournament` mais qui l'englobe) : bloquée par garde applicative si `seasons.<N>.is_archived !== true` (empêche d'écraser une saison jamais archivée — le vrai risque à éliminer). Si autorisée : upsert `seasons.<N+1> = { is_active: true, is_archived: false }`, `seasons.<N>.is_active = false`, **puis** appel à `reset_tournament`. Ces 3 opérations doivent être solidaires (même RPC/transaction que le reset, pas 2 boutons séparés à cliquer dans le bon ordre) — c'est le seul moment où `is_active` bouge et où les tables `live_*` sont vidées.

Ainsi il existe toujours exactement une ligne `is_active = true` (l'invariant que vous décrivez), la fenêtre "saison archivée mais encore affichée en live" est un état de premier rang, pas un bug transitoire, et l'ordre dangereux (perdre les données avant de les avoir archivées) devient structurellement impossible plutôt que simplement recommandé.

---

## 5. Pipeline d'archivage proposé

### Pré-requis
- `live_tournament.status === 'TERMINE'` (podium déjà généré).
- Idéalement, aucun `live_matches.status = 'EN_COURS'` restant (un match jamais saisi ne doit pas être archivé silencieusement en score `null`/`0`) — bloquer plutôt qu'ignorer, à l'inverse de `/api/admin/live-elo` qui filtre discrètement `.eq('status','TERMINE')`.
- Garde d'idempotence stricte : si `games` contient déjà une ligne pour l'année à archiver, refuser (empêche un double-clic de dupliquer toute la saison dans l'historique et de fausser l'ELO recalculé).

### Étapes
1. **Lire les données source** : `live_teams` (hors placeholder `id='Z'`, motif déjà vu dans `admin/page.tsx`), `live_matches` (`status='TERMINE'` uniquement), `live_tournament.format`, année en cours (à définir : nouveau champ `live_tournament.year`, ou saisie manuelle au moment d'archiver — aujourd'hui rien ne stocke l'année côté `live_tournament`).
2. **Insérer dans `teams`** une ligne par `live_teams` : `{ nom: <lettre>, year, tireur_id, pointeur_id }`, laisser `id` s'auto-générer, construire le dictionnaire `lettre → nouvel id`.
3. **Insérer dans `games`** une ligne par `live_matches` : `{ year, poule, type, tableau: tableau ?? 'Principal', team_1_id: dict[team1_id], team_2_id: dict[team2_id], score_1, score_2 }`, `id` auto-généré.
4. **Mettre à jour `seasons`** : upsert `{ year, format: live_tournament.format, is_archived: true }` pour l'année qui vient d'être jouée — **`is_active` n'est pas touché** (voir §4, cycle de vie découplé). Si la ligne `seasons.<year>` n'existe pas encore (cas plausible : `seasons` n'a jamais été alimentée automatiquement, cf. §4), la créer avec `is_active: true` seulement si aucune autre ligne n'est déjà active — sinon la laisser `is_active: false` par défaut pour ne pas violer l'invariant "une seule ligne active".
5. **Appeler `/api/admin/recompute-elo`** (déjà existant, aucune modification nécessaire) — il rejoue **toute** la table `games` multi-saisons depuis `elo_init`, donc reconstruit `elo_history`+`history_all` avec la nouvelle saison incluse automatiquement.
6. **Logger** l'action dans `activity_logs` (`ADMIN_ARCHIVE_TOURNAMENT`, métadonnées : année, format, nb équipes, nb matchs) — cohérent avec les autres actions admin déjà tracées.
7. **Fin de l'action "Archiver".** `/live`, `/live/podium` et l'accueil continuent d'afficher le tournoi normalement (rien n'a changé côté `live_*`/`is_active`). `reset_tournament` n'est **pas** appelé ici — c'est le rôle de l'action distincte "Passer à la saison suivante" (§4), déclenchée plus tard, à la discrétion du super, une fois que tout le monde a fini de consulter le direct.

### Où faire vivre ce pipeline
Deux options, à trancher :
- **RPC Postgres `archive_tournament(...)`** (`SECURITY DEFINER`, transactionnelle) — même philosophie que `reset_tournament` déjà en place : garantit qu'un échec réseau au milieu de l'opération ne laisse pas `teams` peuplée sans `games` correspondants (ou l'inverse). Recommandé.
- **Route API `/api/admin/archive-tournament/route.ts`** (client `service_role`, comme `/api/admin/recompute-elo`) — plus simple à écrire/déboguer côté repo (tout le reste du pipeline ELO vit déjà en TypeScript ici), mais pas de vraie transaction multi-tables depuis le SDK JS : nécessite une vérification d'erreur stricte à chaque insert (leçon déjà tirée pendant `plan_10_teams.md` — "erreurs silencieuses" corrigées sur les inserts `live_teams`/`live_matches`) et un rollback manuel du côté `teams` si l'insert `games` échoue ensuite.

Dans les deux cas : déclenché par un bouton "Archiver le tournoi" réservé `super` (nouvelle page `/live/(super)/archive`, ou intégré à `/live/(super)/super`), jamais automatique.

### Action 2 — "Passer à la saison suivante" (distincte, plus tard)

Nouvelle action, séparée de l'archivage (§4). Peut vivre sur la page `/live/(super)/reset` existante (ex. : un écran en 2 temps — rappel "avez-vous archivé ?", puis le formulaire de confirmation "RESET" déjà en place) ou sur un nouvel écran dédié. Doit, dans une seule opération solidaire (RPC recommandé, même raisonnement que ci-dessus) :
1. Vérifier `seasons.<année en cours>.is_archived === true` — sinon bloquer avec un message explicite ("Archivez d'abord le tournoi avant de passer à la saison suivante"), pas juste un avertissement contournable.
2. `seasons.<N+1>` upsert `{ is_active: true, is_archived: false }`.
3. `seasons.<N>.is_active = false`.
4. Appeler `reset_tournament` (RPC existant, inchangé).

`reset_tournament` lui-même n'a pas besoin d'évoluer — il continue de ne s'occuper que des tables `live_*`. C'est la nouvelle action qui l'entoure et gère `seasons`.

---

## 6. Généralisation des pages d'archives (préalable indispensable)

### `app/(sections)/tournois/[year]/page.tsx`
- **"LA finale" / champion de l'année** : aujourd'hui `type='Finale' AND tableau='Principal'` — ne matchera jamais rien pour `10_equipes`/`ronde` (leur finale n°1 s'appelle `'Finale Rang1'`, sans notion de tableau). À remplacer par une détection générique via `steps.value === 1`, exactement le même principe que `finalTop8` (déjà présent dans ce fichier, déjà générique) et que `podium/page.tsx` côté live.
- **Bloc "Finales" secondaires** (`autresFinales`) : liste blanche de 3 chaînes exactes (`'petite finale'`, `'toute petite finale'`, `"finale d'honneur"`) — à remplacer par un filtre générique ("tout match de type finale, sauf LA finale elle-même"), avec libellé lisible via `steps.label` (déjà fait ailleurs dans `finale/page.tsx`/`podium/page.tsx`, absent ici : le fichier affiche `m.type` brut).
- **Bloc "Demis"** : toujours rendu (header + grille), même vide — à garder derrière `demis.length > 0` comme le fait déjà `podium/page.tsx` pour le live.
- **Bloc "Poules"** : itère en dur `['Gassin', 'Ramatuelle']` — à rendre conditionnel sur `seasons.format === 'ronde'` → `['Ronde']` avec un seul `PouleStandingsTable` pleine largeur (calqué sur `podium/page.tsx`, section "TABLEAUX DE POULES", qui gère déjà ce cas côté live).

### `app/(sections)/tournois/page.tsx` (liste des éditions)
- Le filtre `.eq('type', 'Finale').eq('tableau', 'Principal')` pour retrouver le champion de chaque année a le même problème — nécessite soit une jointure sur `steps.value = 1`, soit une requête par année analogue à `finalTop8`.

### Critère de non-régression
Ces deux pages doivent continuer à afficher **identiquement** toutes les saisons déjà archivées (implicitement `classique`) après généralisation — c'est le test à faire *avant* de considérer ce chantier terminé, indépendamment de la saison 2026.

---

## 7. Points d'attention / risques

- **Fenêtre "archivée mais encore live"** : entre l'action 1 (archiver) et l'action 2 (passer à la saison suivante), `teams`/`games` **et** `live_*` contiennent simultanément les mêmes données (année N). C'est voulu (§4), mais ça veut dire que `/tournois/<N>` et `/live` peuvent afficher deux vues légèrement différentes du même tournoi si un score est corrigé manuellement d'un côté sans l'autre après coup (ex. correction via `/live/(super)/admin_teams` après archivage) — pas de synchronisation automatique entre les deux copies. À documenter clairement dans l'UI de la page "Archiver" (ex. "toute correction après archivage devra être répercutée manuellement").
- **Double archivage empêché, mais pas un archivage suivi d'un reset sans re-vérification** : la garde de l'action 2 (§5) vérifie seulement `is_archived === true`, pas que l'archive reflète l'état *actuel* de `live_*` si des scores ont été corrigés entre-temps — acceptable vu la fenêtre normalement courte entre les deux actions, mais à garder en tête.
- **`poule = 'Ronde'`** stocké tel quel dans `games.poule` : vérifier qu'aucun autre endroit (stats, classement) ne suppose implicitement `poule ∈ {'Gassin','Ramatuelle'}` sur les données archivées avant de figer ce choix.
- **Idempotence stricte** : sans garde bloquante (pas juste un avertissement), un double archivage duplique toute la saison dans `teams`/`games`, fausse silencieusement l'ELO recalculé sur *toutes* les saisons (le recompute est global). Envisager aussi une contrainte unique côté Supabase en complément de la vérification applicative.
- **Ordre non négociable, maintenant appliqué structurellement (§4/§5)** : l'action 2 ("Passer à la saison suivante", seule à appeler `reset_tournament`) est bloquée tant que `is_archived` n'est pas vrai — l'ordre dangereux n'est plus qu'une simple recommandation. Une sauvegarde (export CSV/dump) de `live_teams`/`live_matches` juste avant l'appel à `reset_tournament`, même après un archivage réussi, coûte peu et couvre le cas où un problème serait découvert après coup.
- **Droits** : les deux nouvelles actions (archiver, passer à la saison suivante) doivent être restreintes à `super`, comme `reset_tournament` et `/api/admin/recompute-elo`.
- **Pas de schéma versionné** : comme pour tout le reste du projet (cf. `architecture.md` §11), la colonne `seasons.format`, une éventuelle contrainte unique sur `games`, et le RPC `archive_tournament` devront être appliqués manuellement dans Supabase et documentés ici une fois faits (aucune migration SQL n'est commitée dans ce dépôt à ce jour).

---

## 8. Vérification prévue

1. Généraliser `tournois/page.tsx` + `tournois/[year]/page.tsx` **sans toucher aux données** → vérifier que toutes les années déjà archivées s'affichent à l'identique (comparaison avant/après).
2. Tester le pipeline d'archivage sur les 3 formats séparément, si possible sur un jeu de données jetable (pas la vraie saison 2026 en premier essai) : `classique` (non-régression), `10_equipes`, `ronde`.
3. Après un archivage test, vérifier tous les points de lecture de `teams`/`games`/`elo_history`/`history_all` : `/tournois`, `/tournois/[year]`, `/classement`, `/stats`, fiche joueur (`EloChart`, `SeasonHistory`), `GlobalProgressionChart`.
4. Vérifier qu'un nouveau tournoi peut démarrer proprement après le `reset_tournament` qui suit l'archivage (pas de résidu de la saison archivée dans `live_*`, `format` revenu à `'classique'` par défaut).

---

## 9. Hors scope

- Migration de `live_selected`/`live_history` vers un équivalent archivé — jamais fait historiquement, pas de besoin identifié.
- Interface de "ré-ouverture"/correction d'une saison déjà archivée (au-delà de l'édition manuelle déjà possible via `/live/(super)/admin_teams` pour les équipes).
- Export/impression PDF du palmarès archivé (déjà listé séparément dans `documents/todo.md`, boîte à idées).

## 10. Reste à faire

- [x] Cycle de vie `is_active`/`is_archived` tranché (§4) — deux actions distinctes, toujours une saison active, archivage sans impact visible sur le live.
- [x] Généraliser `tournois/page.tsx` + `tournois/[year]/page.tsx` (§6) : détection de finale/podium/poules basée sur `steps.value` et sur les données (`poule='Ronde'`) plutôt que sur des chaînes figées pour le format classique — fonctionne sans attendre `seasons.format`. Non-régression vérifiée par requête directe sur les 6 saisons réellement archivées (2020-2025, toutes `classique`) : résultats strictement identiques à l'ancienne logique (laFinale, autresFinales, demis, sélection du champion dans la liste des éditions).
- [x] SQL écrit (`documents/private/archive_tournament.sql`, non exécuté — à lancer manuellement par l'utilisateur dans le SQL editor Supabase) : colonnes `seasons.format`/`seasons.is_archived` + backfill des 6 saisons déjà archivées, index unique `teams(year, nom)` (garde d'idempotence dure), RPC `archive_tournament(p_year)` (Action 1) et `advance_to_next_season(p_next_year)` (Action 2, englobe `reset_tournament`). Détail : §11 ci-dessous.
- [ ] Exécuter ce script dans Supabase (**vous-même, jamais fait par l'agent** — voir §12), vérifier qu'il tourne sans erreur.
- [x] UI écrite : `/live/archive` ("Archiver le tournoi", appelle `archive_tournament` puis `POST /api/admin/recompute-elo`) et `/live/next-season` ("Passer à la saison suivante", appelle `advance_to_next_season`, bloquée tant que la saison active n'est pas archivée). Liens ajoutés dans `/live/super` (nouvelle section "Fin de saison"). **Non testée en conditions réelles** (nécessite le SQL exécuté + une session super) — voir §12.
- [ ] Tester les 3 formats sur données jetables (année de test, ex. 1999) avant le premier archivage réel — pas encore fait, l'UI n'a été vérifiée que par typecheck/lint et résolution de route (pas de rendu réel, faute de session authentifiée).
- [ ] **Constat en observant l'état réel de la base (2026-08-05, lecture seule)** : `live_tournament` est actuellement `status='TERMINE'`, `format='10_equipes'`, 10 équipes / 25 matchs tous `TERMINE` — la saison 2026 semble être le vrai tournoi joué le 4 août, prêt à être archivé dès que le bouton existera. À confirmer avec l'utilisateur avant tout archivage réel (pas de test résiduel/simulé).
- [ ] Exécuter l'archivage réel de la saison 2026, vérifier `/tournois/2026`, **puis seulement**, à la discrétion du super, déclencher l'action 2.

## 11. SQL écrit, pas encore exécuté

`documents/private/archive_tournament.sql` (gitignoré comme le reste de `documents/private/`) contient les 4 sections suivantes, à exécuter dans l'ordre :
1. `seasons.format`/`seasons.is_archived` + backfill (2020-2025 → `'classique'`/`true`, 2026 non touché) + index unique sur `year` (cible des `ON CONFLICT` des RPC).
2. Index unique `teams(year, nom)` — vérifié réalisable sans nettoyage (aucun doublon existant sur cette paire à ce jour).
3. `archive_tournament(p_year integer)` — vérifie `super`, `live_tournament.status='TERMINE'`, aucun match live non terminé, refuse si l'année est déjà dans `games` ; copie `live_teams`→`teams` puis `live_matches`→`games` (deux CTE modificatrices chaînées, le mapping lettre→id ne quitte jamais la requête SQL) ; marque `seasons.<p_year>.is_archived = true` sans toucher `is_active`.
4. `advance_to_next_season(p_next_year integer)` — vérifie `super`, refuse si la saison active n'est pas encore `is_archived`, active `p_next_year`, désactive l'année courante, puis appelle `reset_tournament()`.

Reste hors de ce script (prochaine étape, côté application) : les deux points d'entrée UI qui appellent ces RPC (`supabase.rpc('archive_tournament', { p_year })` / `supabase.rpc('advance_to_next_season', { p_next_year })`), plus l'appel à `/api/admin/recompute-elo` après un archivage réussi.

## 12. UI écrite (`/live/archive`, `/live/next-season`)

Deux pages `super` créées, même style que `/live/(super)/reset` :

- **`app/live/(super)/archive/page.tsx`** — affiche le statut/format/nb équipes/nb matchs du tournoi live, année pré-remplie depuis `seasons.is_active`, bloque le bouton tant que `status !== 'TERMINE'` ou qu'il reste des matchs non terminés (double sécurité, déjà vérifiée côté RPC), confirmation par saisie du mot "ARCHIVER". Appelle `archive_tournament(p_year)` puis `POST /api/admin/recompute-elo`, affiche le résultat et un lien vers `/tournois/<year>`.
- **`app/live/(super)/next-season/page.tsx`** — lit la saison active (`seasons.is_active=true`) ; si elle n'est pas encore `is_archived`, bloque avec un lien direct vers `/live/archive` (pas de contournement possible depuis cet écran) ; sinon, année suivante pré-remplie (année active + 1), confirmation par saisie du mot "SUIVANT", appelle `advance_to_next_season(p_next_year)`, redirige vers `/live/admin` (nouveau tournoi à configurer).
- Deux liens ajoutés dans `/live/(super)/super/page.tsx`, nouvelle section "Fin de saison" entre "Maintenance des scores" et la "Zone critique" existante (le reset brut `/live/reset` reste inchangé et accessible séparément — usage différent, cf. plan §5).

**Pas de `logActivity()` appelé depuis ces deux pages** : `utils/log-activity.ts#logActivity` n'enregistre explicitement rien pour le rôle `super` (`if (role === 'super') return;`), et ces deux actions sont justement réservées à `super` — un appel aurait été un no-op silencieux. Cohérent avec `/live/(super)/reset/page.tsx`, qui n'appelle pas non plus `logActivity`. Pas de trace dans `activity_logs` pour ces actions à ce stade — à revisiter si un jour ce point est jugé gênant (ex. faire écrire la RPC elle-même dans `activity_logs`, en contournant le filtre `super` de `logActivity`).

**Vérification faite** : `tsc --noEmit` propre sur tout le projet ; les deux routes répondent (redirigent vers `/login`, comme toute page derrière `proxy.ts` en l'absence de session — comportement identique aux autres pages `/live/(super)/*`) sans erreur 500. **Vérification NON faite** : rendu réel de la page, appel réel des RPC — impossible sans le SQL exécuté et une session `super` authentifiée. À faire par vous après avoir exécuté `documents/private/archive_tournament.sql`.

## 13. Filet de sécurité — sauvegarde manuelle + transaction explicite

Ajouté suite à une inquiétude légitime de l'utilisateur avant d'exécuter le SQL en base réelle.

- **`documents/private/archive_tournament.sql` enveloppé dans `begin;`/`commit;`** — le script ne touche de toute façon aucune donnée de tournoi (seulement colonnes/index/définitions de fonction), mais la transaction garantit maintenant un "tout ou rien" même sur le script lui-même : si une étape échoue, rien n'est appliqué (Postgres supporte le DDL transactionnel).
- **`archive_tournament()`/`advance_to_next_season()` sont déjà atomiques par construction** (une fonction Postgres = une transaction) et `archive_tournament()` ne supprime jamais rien dans `live_*` (copie seule) — le vrai point de non-retour reste `advance_to_next_season()` (via `reset_tournament()`), déjà isolé et gardé par la vérification `is_archived`.
- **Nouveau : `POST /api/admin/backup-tournament-data`** (`app/api/admin/backup-tournament-data/route.ts`) — export JSON de `seasons`, `teams`, `games`, `live_tournament`, `live_teams`, `live_matches`, `live_selected`, `live_history`, `elo_history`, `history_all`, `steps`, `settings`. Pas un vrai `pg_dump` (nécessiterait une connexion Postgres directe, absente de `.env.local` qui n'expose que l'URL Supabase + les clés anon/service_role) — un filet manuel, suffisant pour vérifier/reconstituer l'état d'avant en cas de souci. **Vérifie `is_super()` avant de répondre** (403 sinon, confirmé par test réel sans session) — contrairement à `/api/admin/recompute-elo`/`live-elo` qui n'ont aucune vérification de rôle (lacune préexistante, non corrigée ici, à signaler dans `todo.md`).
- **`utils/download-backup.ts`** — helper client partagé (fetch + déclenchement du téléchargement navigateur), réutilisé à 3 endroits :
  - `/live/super` — nouvelle section "Sécurité", bouton dédié.
  - `/live/archive` — bouton discret juste avant le formulaire de confirmation.
  - `/live/next-season` — même bouton, mis en évidence (orange) car c'est ici que `reset_tournament()` est réellement appelé.

Pour une sauvegarde plus complète qu'un export JSON par table (schéma, index, policies RLS inclus), l'option native de Supabase (Dashboard → Database → Backups / Point-in-time recovery, selon le plan tarifaire) reste la référence — à vérifier de votre côté si disponible sur votre offre, en complément de ce bouton plutôt qu'à sa place.

## 14. Continuité de l'ELO d'une saison à l'autre — vérifié, un trou comblé

Question posée par l'utilisateur avant le premier archivage réel : le graphique de progression de `/live` et le classement ELO doivent-ils repartir de la fin de la saison précédente, et l'ELO global (Classic **et** Modern) doit-il être recalculé à l'archivage ?

**Déjà correct par construction, vérifié dans le code (pas juste supposé)** :
- Le graphique `/live` (RPC `get_full_live`, table `live_history`) n'est jamais touché par `archive_tournament()` — seul `reset_tournament()` (appelé par `advance_to_next_season`) le vide, ce qui est le comportement voulu (nouvelle saison = nouveau graphique).
- `app/live/(admin)/admin/page.tsx` (`fetchPlayersWithElo`, ligne ~177-188, appelée à chaque ouverture de l'étape JOUEURS) lit déjà, pour chaque joueur, la **dernière** ligne de `elo_history` (triée par `game_id` décroissant) — donc l'ELO de départ d'une nouvelle saison reprend nativement là où la précédente s'est arrêtée, **à condition que `elo_history` ait été reconstruit**.
- `/api/admin/recompute-elo` recalcule déjà systématiquement **les deux algorithmes** (`calculatePstElo`/`elo_value` et `calculateModernElo`/`elo_modern_value`) sur toute la table `games` — la saison archivée y est automatiquement incluse dès qu'elle y apparaît.

**Trou trouvé et comblé** : `archive_tournament()` marque `seasons.is_archived = true` **dans sa propre transaction**, avant que le client n'appelle `POST /api/admin/recompute-elo` (étape cross-langage, forcément hors de cette transaction SQL). Si cet appel échouait après coup, la saison restait marquée archivée sans que `elo_history` reflète ses résultats — et rien n'empêchait de démarrer la saison suivante dans cet état, avec des joueurs positionnés sur un ELO obsolète. Deux corrections :
1. **`/live/archive/page.tsx`** distingue maintenant "l'archivage a échoué" de "l'archivage a réussi mais le recalcul ELO a échoué" — dans ce second cas, un bouton dédié **"Réessayer le recalcul ELO"** reste affiché tant que ce n'est pas fait, sans jamais relancer `archive_tournament` (qui de toute façon refuserait, l'année étant déjà marquée archivée).
2. **`advance_to_next_season()`** (SQL) refuse désormais de continuer si `elo_history` ne contient aucune ligne pour la saison active — garde au niveau base, indépendante de la discipline côté écran.

**Action requise de votre part** : le fichier `documents/private/archive_tournament.sql` a été modifié après votre première exécution (nouvelle garde dans `advance_to_next_season`) — à ré-exécuter en entier avant le premier archivage réel (sûr à rejouer : `create or replace function`/`if not exists` partout, transaction explicite).

## 15. Premier archivage réel tenté — deux essais, deux erreurs d'id, corrigées

**Constat** : les deux premiers essais réels (2026-08-05) ont échoué à l'insertion dans `teams` puis `games`. **Aucune conséquence sur les données à aucun des deux essais** — `archive_tournament()` est une fonction (= une transaction), chaque échec a tout annulé automatiquement. Vérifié après coup : `games` ne contient toujours aucune ligne pour 2026, `seasons.2026.is_archived` est resté `false`, `teams` toujours à 48 lignes.

**Essai 1 — `duplicate key value violates unique constraint "teams_pkey"`** : l'import initial (`migration-pst.ts`) insère `teams`/`games` avec des `id` explicites (`id: e.id !== undefined ? e.id : index`, `id: m.id`), sans jamais faire avancer les séquences auto-incrémentées sous-jacentes. `archive_tournament()` n'insérait pas d'`id` (le laissait s'auto-générer via `nextval()`) — la séquence de `teams.id` étant restée à une valeur basse, `nextval()` est retombé sur un id déjà pris.

Premier correctif tenté : resynchroniser les séquences via `setval()` avant insertion — **incomplet**, cf. essai 2.

**Essai 2 — `null value in column "id" of relation "games" violates not-null constraint"`** : le `setval()` sur `games.id` ne faisait en réalité rien, car `pg_get_serial_sequence('games','id')` renvoie `NULL` (cette colonne n'a **aucun** `DEFAULT` du tout, contrairement à `teams.id` qui en a un — asymétrie de schéma non documentée, cf. `architecture.md` §11 sur l'absence de schéma versionné). `setval(NULL, ...)` est un no-op silencieux en Postgres (propagation NULL standard), d'où l'absence d'erreur à ce moment-là et l'échec plus loin, au moment de l'insert réel.

**Correction définitive** : abandon de toute dépendance à un `DEFAULT`/une séquence, remplacé par un calcul d'id explicite et déterministe — `select coalesce(max(id),0)+1 into v_next_team_id from teams` (idem pour `games`), puis `v_next_team_id + row_number() over (order by lt.id) - 1` dans le `SELECT` de l'`INSERT`. Fonctionne quel que soit l'état réel du schéma (avec ou sans `DEFAULT`, quel que soit son nom), donc plus robuste que le correctif précédent.

**Action requise de votre part** : ré-exécuter `documents/private/archive_tournament.sql` en entier (troisième fois — toujours sûr à rejouer), puis retenter l'archivage de la saison 2026.

