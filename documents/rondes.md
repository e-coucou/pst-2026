# Format "Ronde" (3ème choix) pour le tournoi live PST à 10 équipes

**Statut global :** Implémenté et testé par l'utilisateur (branche `rondes`). Non-régression confirmée en `classique` et `10_equipes`. Format `ronde` validé de bout en bout avec quelques nuls en simulation.

## Contexte

Le format "10 équipes" (2 poules de 5 en round-robin + 5 finales classées) est déjà en prod. 3ème format pour la même taille (10 équipes/20 joueurs) : système suisse façon échecs, nommé **Ronde** — ronde 1 tirée au sort (5 matchs), puis à chaque ronde suivante les équipes sont appariées par score cumulé décroissant (en évitant les rematchs). **4 rondes suisses**, puis une **5ème ronde qui est en réalité une ronde de finales classées** (appariement par rang adjacent sur le classement cumulé : 1v2, 3v4, 5v6, 7v8, 9v10) — même principe que les 5 finales classées du format 10 équipes, avec tableau des finales, libellés (Finale / Petite Finale / ...) et bonus ELO hérités automatiquement.

Le cycle live (`live_tournament.status` : JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE) a été rendu générique pour supporter 3 formats via `live_tournament.format` (`'classique'` | `'10_equipes'` | `'ronde'`), en réutilisant au maximum l'existant : `calculatePouleStandings`, `PouleStandingsTable`, `updateMatchScore`, `finalTop8`/table `steps`.

**Différence structurelle clé** : le round-robin classique génère tous les matchs d'un coup. Le format Ronde génère une ronde à la fois — l'appariement de la ronde N+1 dépend des résultats de la ronde N. D'où une page dédiée `/live/ronde` avec une action "Générer la ronde suivante" répétée, qui bascule sur "Générer les Finales" après la ronde 4.

**Simplification qui évite un gros travail sur le schéma** : pas de séparation Gassin/Ramatuelle pour les rondes suisses — un seul groupe de 10 équipes, `poule = 'Ronde'` (constante) pour équipes et matchs de rondes. `calculatePouleStandings('Ronde', teams, matches, playersMap)` calcule directement le classement cumulé, sans modification de cette fonction. Les 5 matchs de finales, eux, réutilisent tel quel le mécanisme du format 10 équipes : `type: 'Finale Rang1'..'Finale Rang5'`, `poule: ''`, mêmes lignes `steps` (baseRank 1/3/5/7/9), donc **aucune nouvelle ligne `steps` requise** et le multiplicateur ELO "Finale" (`type.includes("Finale")` dans `lib/elo-engine.ts`) s'applique automatiquement.

## Approche retenue

### 1. Stockage — ✅ Fait
- `live_tournament.format` : valeur `'ronde'` (texte libre).
- `live_matches.round integer` (nullable) — migration appliquée. Identifie la ronde (1 à 4) d'un match suisse, indépendamment de `poule` (constant `'Ronde'`). Null/inutilisé pour les autres formats et pour les matchs de finales.
- **CHECK constraints découvertes en pratique** (comme `live_teams_id_check` lors du format 10 équipes) : `live_teams_poule_check` et `live_matches_poule_check` limitaient les valeurs à `'Gassin'/'Ramatuelle'` (+ `''` pour les matchs de finales côté `live_matches`). Étendues pour inclure `'Ronde'`.

### 2. Sélecteur de format (`admin/page.tsx`) — ✅ Fait
3ème bouton `'ronde'` ("Ronde (10 équipes)"). `getRequiredCount`/`getTeamIds` généralisés (`format === 'classique' ? ... : ...`). `poule: 'Ronde'` pour toutes les équipes dans `syncTeamsToDatabase`/`confirmAndCreateTournament`. Aperçu "Doublettes" sans badge village pour ce format. `confirmAndCreateTournament` génère uniquement la **ronde 1** (tirage aléatoire, `round: 1`), statut → `POULES`, redirection `/live/ronde`.

### 3. Page `app/live/(admin)/ronde/page.tsx` — ✅ Fait
Pilotée par ronde : `matches` = tous les `live_matches` `poule = 'Ronde'` (rondes 1-4 confondues) ; `currentRound = Math.max(...matches.map(m => m.round))` ; `roundMatches` = ronde courante (5 lignes de saisie) ; `standings = calculatePouleStandings('Ronde', teams, matches, playersMap)` affiché via `PouleStandingsTable` ; historique des rondes précédentes en lecture seule.

**`generateNextRound`** (`TOTAL_SWISS_ROUNDS = 4`) :
- Rondes 1 à 3 terminées → génère la ronde suivante par appariement suisse (cf. §4), reste en statut `POULES`.
- Ronde 4 terminée → génère les **5 finales classées** (appariement par rang adjacent sur `standings`, types `'Finale Rang1'..'Finale Rang5'`, `poule: ''`), statut → `FINALE`, redirection `/live/finale` (page réutilisée telle quelle, cf. §6).

### 4. Algorithme d'appariement suisse — ✅ Fait
`utils/live-stats.ts` — `generateRondePairing(standings, playedPairs)` : appariement glouton par rang adjacent, anti-rematch (`playedPairs` reconstruit via `buildPlayedPairs(matches)`), fallback sur le premier adversaire disponible en cas de blocage (marginal à cette échelle). Ronde 1 : tirage aléatoire simple géré directement dans `admin/page.tsx` (pas de score à ce stade, pas besoin de cette fonction).

### 5. Stepper (`components/Stepper.tsx`) — ✅ Fait
Prop `format?: string` remplace `skipDemi?: boolean` (le composant choisit lui-même la liste d'étapes) :
- `'classique'` → 6 étapes. `'10_equipes'` → 5 étapes (pas de Demis).
- `'ronde'` → 5 étapes : Joueurs / Equipes / **Rondes** (id `'POULES'`, libellé renommé) / **Finales** (id `'FINALE'`) / Podium.

### 6. `finale/page.tsx`, `podium/page.tsx`, `app/live/page.tsx` — ✅ Fait
`finale/page.tsx` est **réutilisée sans changement structurel** pour le format Ronde (elle est déjà générique : matchs filtrés par `type.toLowerCase().includes('inale')`, libellés via `steps.label`, bonus ELO via `lib/elo-engine.ts`) : seul ajout, la section mini-classement en bas affiche `renderStandingsMini('Ronde', ...)` au lieu de Gassin/Ramatuelle quand `format === 'ronde'`, et la nav retour pointe vers `/live/ronde`.

`podium/page.tsx` et `app/live/page.tsx` : **`finalTop8` gère nativement le format Ronde** (générique, basé sur `steps.value` + win/loss, indépendant du format) — aucun classement alternatif nécessaire. Seuls ajustements : sections qui itèrent `['Gassin', 'Ramatuelle']` (classement de poules détaillé, détail des matchs) itèrent `['Ronde']` à la place ; section "Scores des Finales" gate sur `matches.length > 0` (data-driven, plutôt que sur l'index du statut `'FINALE'`).

### 7. Outil de test : simulation de scores aléatoires — ✅ Fait (ajout non prévu au plan initial)
Bouton 🎲 "Simuler" (super admins uniquement, `hooks/useIsSuper.ts` via RPC `is_super`) sur `poules`, `demi`, `finale` et `ronde` — remplit les matchs non terminés avec des scores aléatoires via `utils/simulate.ts` (`simulateRandomScores`, même pipeline `updateMatchScore` que la saisie manuelle). Deux modes :
- `'finale'` (demis, finales, y compris les finales classées de Ronde) : un score à 13, l'autre aléatoire 0-12, jamais de nul.
- `'poule'` (poules classique/10 équipes, rondes 1-4 de Ronde) : scores gaussiens indépendants (moyenne 8, écart-type 3, bornés 0-13), nuls autorisés — déjà gérés nativement par le moteur ELO et `calculatePouleStandings` (colonne `n`).

Sur `/live/ronde`, cible la ronde courante uniquement, réutilisable ronde après ronde pour observer l'évolution du classement.

### Hors scope (signalé, pas traité)
- `tournois/[year]/page.tsx` (archives) non modifié — aucun tournoi Ronde archivé pour l'instant.
- Le RPC `reset_tournament` (hors repo) doit continuer à remettre `format = 'classique'` par défaut après reset — déjà correct pour les formats existants, aucune adaptation constatée nécessaire pour `'ronde'`.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `app/live/(admin)/admin/page.tsx` | 3ème bouton format ; `poule: 'Ronde'` ; génération ronde 1 + redirection `/live/ronde` ; aperçu doublettes sans badge village |
| `components/Stepper.tsx` | Prop `format` remplace `skipDemi` ; 5 étapes pour `'ronde'` (Rondes + Finales) |
| `app/live/(admin)/ronde/page.tsx` *(nouveau)* | Page ronde-par-ronde (rondes 1-4) ; génère les finales classées à la ronde 4 ; bouton simulation |
| `utils/live-stats.ts` | `generateRondePairing`, `buildPlayedPairs` |
| `app/live/(admin)/poules/page.tsx` | `<RenderStepper format={format} />` ; bouton simulation (mode `'poule'`) |
| `app/live/(admin)/demi/page.tsx` | Bouton simulation (mode `'finale'`) |
| `app/live/(admin)/finale/page.tsx` | Mini-classement + nav retour conditionnels `'ronde'` ; bouton simulation (mode `'finale'`) |
| `app/live/(admin)/podium/page.tsx`, `app/live/page.tsx` | Itération poule `['Ronde']` ; gate `matches.length > 0` sur la section Finales ; `<RenderStepper format={format} />` |
| `hooks/useIsSuper.ts`, `utils/simulate.ts` *(nouveaux)* | Outil de test super admin |
| *(Supabase, appliqué par l'utilisateur)* | `alter table live_matches add column round integer;` ; CHECK constraints `live_teams_poule_check`/`live_matches_poule_check` étendues à `'Ronde'` |

## Vérification

1. **Non-régression** : `'classique'` et `'10_equipes'` inchangés après le refactor `skipDemi` → `format`. — ✅ Confirmé par l'utilisateur.
2. **Format Ronde de bout en bout** : ronde 1 aléatoire, rondes 2-4 appariées sans répétition selon le classement, ronde 4 → génération des 5 finales classées (1v2, 3v4, 5v6, 7v8, 9v10), saisie/simulation des scores sur `/live/finale`, palmarès final cohérent (labels + bonus ELO "Finale"). — ✅ Confirmé par l'utilisateur (quelques nuls en simulation, comportement attendu).
3. **DB** : colonne `live_matches.round` et CHECK constraints étendues. — ✅ Fait par l'utilisateur.
