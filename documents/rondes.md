# Format "Ronde" (3ème choix) pour le tournoi live PST à 10 équipes

## Contexte

Le format "10 équipes" (2 poules de 5 en round-robin + 5 finales classées) est déjà en prod. L'utilisateur veut un **3ème format** pour la même taille (10 équipes/20 joueurs) : système suisse façon échecs, nommé **Ronde** dans l'application — ronde 1 tirée au sort (5 matchs), puis à chaque ronde suivante les équipes sont appariées par score cumulé décroissant (en évitant les rematchs), jusqu'à la ronde 5 qui vaut classement final (pas de bracket demi/finale séparé, le classement final = classement cumulé après 5 rondes).

Le cycle live (`live_tournament.status` : JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE) a déjà été rendu générique pour supporter 2 formats via une colonne `live_tournament.format` (`'classique'` | `'10_equipes'`). Ce plan ajoute une 3ème valeur `'ronde'`, en réutilisant au maximum l'existant : `calculatePouleStandings`, `PouleStandingsTable`, `updateMatchScore`, le pattern `format`/`getTeamIds`/`getRequiredCount`.

**Différence structurelle clé** : les 2 formats existants génèrent tous les matchs de poule d'un coup (round-robin complet connu à l'avance). Le format Ronde ne peut générer qu'une ronde à la fois — l'appariement de la ronde N+1 dépend des résultats de la ronde N. Il faut donc une nouvelle page dédiée avec une action "Générer la ronde suivante" répétée 5 fois, plutôt qu'un simple bouton "lancer les poules".

**Simplification qui évite un gros travail sur le schéma** : pas de séparation Gassin/Ramatuelle pour le format Ronde — un seul groupe de 10 équipes. En donnant `poule = 'Ronde'` (constante) à toutes les équipes et à tous les matchs, `calculatePouleStandings('Ronde', teams, matches, playersMap)` calcule directement le classement cumulé sur toutes les rondes déjà jouées, sans aucune modification de cette fonction ni de `PouleStandingsTable`. Tous les matchs gardent `type: 'Poule'` (pas de nouveau type ⇒ pas de nouvelle ligne `steps` requise, pas de coefficient ELO spécial — cohérent avec le multiplicateur 1.0 déjà appliqué aux matchs de poule classiques).

## Approche retenue

### 1. Stockage
- `live_tournament.format` : ajouter la valeur `'ronde'` (colonne déjà `text` libre, aucune migration si pas de CHECK constraint — **à vérifier en base avant de coder**, par précaution vu les CHECK constraints découvertes après coup sur `live_teams.id` lors du format précédent).
- **Nouvelle colonne** `live_matches.round integer` (nullable) — seule vraie migration nécessaire. Permet de savoir à quelle ronde (1 à 5) appartient un match, indépendamment de `poule` qui reste constant à `'Ronde'`. Null/inutilisé pour les formats classique/10_equipes.
- Vérifier aussi qu'aucun CHECK n'existe sur `live_teams.poule` limitant à `'Gassin'/'Ramatuelle'` (sinon l'étendre à `'Ronde'`).

### 2. Sélecteur de format (`admin/page.tsx`)
- 3ème bouton `'ronde'` à côté de `'classique'`/`'10_equipes'` (libellé "Ronde (10 équipes)").
- `getRequiredCount`/`getTeamIds` déjà génériques par un `format === 'classique' ? ... : ...` — le format Ronde tombe naturellement dans la branche "10 équipes" (élargir la condition de `format === '10_equipes'` à `format !== 'classique'`).
- Attribution du village par équipe : nouvelle branche — si `format === 'ronde'`, `poule: 'Ronde'` pour toutes les équipes (au lieu de calculer via `getGassinIds`). Impacte `syncTeamsToDatabase` et `confirmAndCreateTournament`.
- Aperçu "Doublettes" (étape 2, affichage Gassin/Ramatuelle par équipe) : masquer le badge village et la coloration bleu/rouge quand `format === 'ronde'` (pas de répartition en 2 villages).
- `confirmAndCreateTournament` : nouvelle branche — au lieu d'appeler `generateOrderedMatches` (round-robin), tirer au sort les 10 équipes et générer **uniquement la ronde 1** (5 matchs, `type: 'Poule'`, `poule: 'Ronde'`, `round: 1`, `tableau: 'Principal'`, `status: 'EN_COURS'`). Statut tournoi → `POULES` (inchangé), redirection vers `/live/ronde` (nouvelle page) au lieu de `/live/poules`.

### 3. Nouvelle page `app/live/(admin)/ronde/page.tsx`
Calquée sur la structure de `poules/page.tsx` (fetch, saisie de scores via `updateMatchScore`, `PredictionModal`) mais pilotée par ronde :
- `matches` = tous les `live_matches` avec `poule = 'Ronde'` (toutes rondes confondues).
- `currentRound` = `Math.max(...matches.map(m => m.round))`.
- `roundMatches` = `matches.filter(m => m.round === currentRound)` → 5 lignes de saisie de score (même markup que les lignes de `renderPouleSection`, sans le split orange/violet par poule).
- `standings` = `calculatePouleStandings('Ronde', teams, matches, playersMap)` (réutilisé tel quel) → affiché via `<PouleStandingsTable pouleName="Ronde" standings={standings} .../>`.
- Historique des rondes précédentes affiché en lecture seule en dessous (cartes compactes groupées par `round`, sur le modèle de `renderDemiSummary` dans `demi/page.tsx`).
- Bouton d'action, visible quand `roundMatches.every(m => m.status === 'TERMINE')` :
  - Rondes 1 à 4 terminées → "Générer la Ronde N+1" : calcule les nouveaux appariements (cf. §4), insère 5 nouveaux matchs `round: N+1`, reste en statut `POULES`.
  - Ronde 5 terminée → "Terminer le tournoi" (même logique que `completeTournament` dans `demi/page.tsx`) : statut → `TERMINE`, redirection `/live/podium`.
- `<RenderStepper currentStatus={status} format={format} />`, navigation retour vers `/live/admin`.

### 4. Algorithme d'appariement
Nouvelle fonction exportée dans `utils/live-stats.ts` (à côté de `calculatePouleStandings`, dont elle consomme la sortie) :
```ts
export const generateRondePairing = (
  standings: PouleStanding[],      // déjà triés par pts/diff/pour
  playedPairs: Set<string>          // clés "A-B" (triées) des duels déjà joués
): [string, string][] => {
  const pool = [...standings];
  const pairs: [string, string][] = [];
  while (pool.length > 0) {
    const a = pool.shift()!;
    let idx = pool.findIndex(b => !playedPairs.has(pairKey(a.id, b.id)));
    if (idx === -1) idx = 0; // fallback si aucun adversaire inédit (cas limite improbable à 10 équipes/5 rondes)
    const [b] = pool.splice(idx, 1);
    pairs.push([a.id, b.id]);
  }
  return pairs;
};
```
Ronde 1 : tirage aléatoire simple (shuffle + appariement séquentiel), géré directement dans `admin/page.tsx` sans passer par cette fonction (pas de score à ce stade). Rondes 2-5 : `generateRondePairing(standings, playedPairs)` avec `playedPairs` reconstruit depuis tous les matchs déjà générés. Appariement glouton par rang adjacent — suffisant pour un tournoi amical à 5 rondes/10 équipes (pas de garantie d'optimalité façon FIDE, mais le risque de blocage est marginal à cette échelle) ; signalé ici en cas de désaccord.

### 5. Stepper (`components/Stepper.tsx`)
Remplacer le prop `skipDemi?: boolean` par `format?: string` (le composant décide lui-même de la liste d'étapes) :
- `'classique'` → 6 étapes (inchangé).
- `'10_equipes'` → 5 étapes, comme aujourd'hui (`skipDemi` équivalent).
- `'ronde'` → 4 étapes : Joueurs / Equipes / **Rondes** (id `'POULES'`, libellé renommé) / Podium.

Callers à mettre à jour (remplacer `skipDemi={format === '10_equipes'}` par `format={format}`) : `admin`, `poules`, `finale`, `podium`, `app/live/page.tsx`, + nouveau `ronde/page.tsx`. `demi/page.tsx` n'a pas besoin du prop (jamais visité en dehors du classique).

### 6. `podium/page.tsx` et `app/live/page.tsx`
Ces deux pages sont quasi identiques (duplication déjà existante, hors scope de la réduire ici). Pour chacune :
- Section classement final (`finalTop8`) : pour `format === 'ronde'`, remplacer par le classement cumulé (`calculatePouleStandings('Ronde', teams, pouleMatches, playersMap)`, rang = index + 1, pas de `label` par match).
- Sections qui itèrent `['Gassin', 'Ramatuelle']` (classement de poules détaillé, détail des matchs de poules) : itérer `['Ronde']` à la place quand `format === 'ronde'`.
- Section "Scores des Finales" (basée sur `matches` = types contenant `'inale'`) : vide en format Ronde par construction (aucun match `Finale`/`Demi`) → gate déjà existant sur `demiMatches.length > 0` pour les demis ; ajouter le même gate `matches.length > 0` autour de cette section (au lieu de la garde sur l'index du statut `'FINALE'`, qui ne passe jamais en Ronde — la garde data-driven est aussi plus robuste, dans l'esprit du fix déjà appliqué aux demis).
- `<RenderStepper .../>` : passer `format={format}`.

### Hors scope (signalé, pas traité)
- Pas de bonus ELO spécifique pour la ronde 5 (traitée comme une ronde de poule normale, multiplicateur 1.0) — cohérent avec le principe "pas de nouveau type de match", à revisiter plus tard si souhaité.
- `tournois/[year]/page.tsx` (archives) non modifié — aucun tournoi Ronde archivé pour l'instant.
- Le RPC `reset_tournament` (hors repo) doit continuer à remettre `format = 'classique'` par défaut après reset — déjà correct pour les 2 formats existants, aucune adaptation nécessaire pour la 3ème valeur.

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `app/live/(admin)/admin/page.tsx` | 3ème bouton format ; branche `poule: 'Ronde'` dans `syncTeamsToDatabase`/`confirmAndCreateTournament` ; génération ronde 1 (tirage aléatoire) + redirection `/live/ronde` ; aperçu doublettes sans badge village ; `<RenderStepper format={format} />` |
| `components/Stepper.tsx` | Prop `format` remplace `skipDemi` ; liste d'étapes à 4 pour `'ronde'` |
| `app/live/(admin)/ronde/page.tsx` *(nouveau)* | Page ronde-par-ronde : saisie scores, génération ronde suivante, historique, fin de tournoi |
| `utils/live-stats.ts` | Nouvelle fonction `generateRondePairing` |
| `app/live/(admin)/poules/page.tsx`, `finale/page.tsx` | `<RenderStepper format={format} />` uniquement (jamais visitées en Ronde) |
| `app/live/(admin)/podium/page.tsx`, `app/live/page.tsx` | Classement final alternatif (Ronde) ; itération poule `['Ronde']` ; gate `matches.length > 0` ; `<RenderStepper format={format} />` |
| *(Supabase, hors repo)* | `alter table live_matches add column round integer;` ; vérifier absence de CHECK bloquant sur `live_tournament.format`/`live_teams.poule` |

## Vérification

1. **Non-régression** : un tournoi complet en `'classique'` et un en `'10_equipes'` se comportent exactement comme avant (Stepper, poules, finales, podium) après le refactor `skipDemi` → `format`.
2. **Format Ronde de bout en bout** : lancer un tournoi test à 10 équipes/20 joueurs en `'ronde'` ; vérifier que la ronde 1 tire 5 matchs aléatoires ; saisir les scores, générer la ronde 2 et vérifier qu'aucune paire ne se répète et que l'appariement respecte l'ordre de classement ; répéter jusqu'à la ronde 5 ; vérifier que le bouton bascule sur "Terminer le tournoi" une fois la ronde 5 close ; vérifier le podium (classement 1-10 basé sur pts/diff/pour cumulés, aucune collision de rang).
3. **DB** : confirmer en base que la colonne `live_matches.round` existe et qu'aucune contrainte CHECK ne bloque `format = 'ronde'` ou `poule = 'Ronde'` avant de tester (sinon `confirmAndCreateTournament` échouera silencieusement comme lors du format précédent — s'assurer que la vérification d'erreur sur les inserts, déjà en place, remonte bien l'erreur).
