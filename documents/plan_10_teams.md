# Format alternatif "10 équipes" pour le tournoi live PST

**Statut global :** Implémentation terminée sur la branche `feature/format-10-equipes`. Tests utilisateur validés (poules → finales classées → podium). Reste : confirmer le fix du RPC `reset_tournament`, puis commit/push.

## Contexte

Pour l'édition 2026, il est possible d'avoir 20 joueurs (10 doublettes) au lieu de 16. Le format envisagé : 2 poules de 5 équipes en round-robin (4 matchs/équipe), puis **pas de demi-finales** — directement 5 finales classées (1er×1er, 2e×2e, 3e×3e, 4e×4e, 5e×5e). Le format "classique" actuel (8 équipes, 2 poules de 4, demies puis 4 finales spécifiques) doit continuer à fonctionner sans régression : c'est un choix fait au début de chaque tournoi live, pas un remplacement.

Exploration du code existant : le cycle live (`JOUEURS → EQUIPES → POULES → DEMI → FINALE → TERMINE`, piloté par `live_tournament.status`) est réparti sur 6 fichiers (`admin`, `poules`, `demi`, `finale`, `podium`, `app/live/page.tsx`), tous écrits pour exactement 8 équipes/2 poules de 4. Bonne nouvelle : une bonne partie du code (calcul des classements, rendu des poules, `finalTop8`, `completeTournament`) est déjà générique et ne nécessite aucune modification. Le travail se concentre sur : la génération round-robin (hardcodée à 4 équipes), la génération des demies/finales (hardcodée à 4+4 matchs), et l'affichage conditionnel de l'étape "Demis".

**Découverte clé** : `lib/elo-engine.ts` et les filtres de `finale/page.tsx`/`podium/page.tsx` matchent par sous-chaîne (`type.includes("Finale")` / `.toLowerCase().includes('inale')`), pas par égalité stricte. En nommant les 5 nouveaux types de finale `'Finale Rang1'`...`'Finale Rang5'`, ils héritent automatiquement du bon coefficient ELO et du bon affichage, sans toucher à ces fichiers.

## Approche retenue

### 1. Stockage du format — ✅ Fait
Nouvelle colonne `live_tournament.format text default 'classique'`. Valeurs : `'classique'` | `'10_equipes'`.

Lu/écrit dans `app/live/(admin)/admin/page.tsx` à l'étape `JOUEURS` (avant constitution des équipes) : sélecteur 2 boutons, verrouillé une fois qu'on avance (`changeFormat`). Toutes les pages du cycle ajoutent `format` à leur `select('status')` existant sur `live_tournament`.

### 2. Round-robin générique (`generateOrderedMatches`) — ✅ Fait, vérifié
Séquence hardcodée `[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]` remplacée par `generateRoundRobinPairs(n)` (méthode du cercle, générique, avec bye si n impair). **Vérifié par exécution réelle** (script Node, pas juste à la main) : n=4 reproduit exactement la séquence legacy, n=5 produit 10 paires uniques avec 4 apparitions par équipe. Zéro régression confirmée sur le format classique.

### 3. Équipes et poules à 10 — ✅ Fait
- `getTeamIds(format)` → `['A'..'H']` (classique) / `['A'..'J']` (10 équipes), factorisé (3 usages).
- `getGassinIds(format)` → `['A','C','E','G']` / `['A','C','E','G','I']`, factorisé.
- `selectionOK`/`requiredCount` (8 ou 10), labels d'affichage `/8` → `/${requiredCount}`.
- `slice(0,4)/slice(4,8)` → `slice(0, half)/slice(half, requiredCount)` dans `finalizeSelectionAndSave` et `handleInitialShuffle`.

### 4. Bifurcation fin de poules : demies vs finales classées — ✅ Fait
`app/live/(admin)/poules/page.tsx` : bouton conditionnel — `generateDemis()` (classique, inchangé) ou nouvelle `generateFinalesClassees()` (10 équipes) : 5 matchs `'Finale Rang1'`..`'Finale Rang5'` (Gassin[i] vs Ramatuelle[i]), statut direct à `'FINALE'` (saute `'DEMI'`), redirection `/live/finale`.

### 5. Stepper conditionnel — ✅ Fait
`components/Stepper.tsx` : prop `skipDemi?: boolean` (5 étapes au lieu de 6). Branché sur `admin`, `poules`, `finale`, `podium`, `app/live/page.tsx`.

`app/live/page.tsx` : garde `currentStepIndex >= statusSteps.findIndex(s => s.id === 'DEMI')` remplacée par `demiMatches.length > 0` (plus robuste, indépendant de la liste `statusSteps`).

### 6. Masquer les sections "Demis" quand elles sont vides — ✅ Fait
`finale/page.tsx`, `podium/page.tsx`, `app/live/page.tsx` : sections liées aux demis gardées derrière `demiMatches.length > 0`.

### 7. Table `steps` — nouvelles lignes — ✅ Fait
5 lignes ajoutées (`Finale Rang1`→1, `Rang2`→3, `Rang3`→5, `Rang4`→7, `Rang5`→9). `finalTop8` déjà générique, aucun changement de code nécessaire pour ça.

### 8. Libellés d'affichage lisibles — ✅ Fait (ajout non prévu au plan initial)
Les types techniques `'Finale Rang1'`..`'Rang5'` ne sont pas des libellés présentables. Ajout d'une colonne `steps.label` (ex: `Finale Rang1` → `Finale`, `Rang2` → `Petite Finale`, `Rang3` → `Toute Petite Finale`, `Rang4` → `Micro Finale`, `Rang5` → `Finale d'Honneur`). `podium/page.tsx`, `app/live/page.tsx` et `finale/page.tsx` lisent maintenant `steps.label` (repli sur `type` brut si absent) partout où le type de match était affiché tel quel. `type` reste inchangé en base (filtres ELO/`.includes('inale')` intacts).

### Hors scope (signalé, pas traité)
- `app/(sections)/tournois/[year]/page.tsx` (affichage historique des années archivées) non modifié.
- RPC `reset_tournament` : **à corriger côté Supabase** — ne remet pas `format` à `'classique'` après un reset (cf. Bugs ci-dessous, fix donné mais pas confirmé appliqué).

## Fichiers modifiés

| Fichier | Changement | Statut |
|---|---|---|
| `app/live/(admin)/admin/page.tsx` | format, `getTeamIds`/`getGassinIds`, round-robin générique, `selectionOK`/labels dynamiques, `slice()` paramétrés, `skipDemi`, vérification d'erreur sur les inserts | ✅ |
| `app/live/(admin)/poules/page.tsx` | lecture `format`, `generateFinalesClassees`, bouton bifurqué, `skipDemi`, lien "suivant" conditionnel | ✅ |
| `components/Stepper.tsx` | prop `skipDemi` | ✅ |
| `app/live/(admin)/finale/page.tsx` | garde demis, `skipDemi`, lien "précédent" conditionnel, fetch `steps`+labels | ✅ |
| `app/live/(admin)/podium/page.tsx` | garde section demis, `skipDemi`, fetch `steps`+labels | ✅ |
| `app/live/page.tsx` | garde demis data-driven, `skipDemi`, fetch `steps`+labels | ✅ |
| *(Supabase, hors repo)* | colonne `format`, contrainte `live_teams_id_check` étendue à I/J, 5 lignes `steps` + colonne `label` | ✅ (fait manuellement par l'utilisateur) |

## Bugs trouvés et corrigés pendant les tests

- **Contrainte CHECK `live_teams_id_check`** limitée à `A`-`H` (schéma non anticipé dans le plan initial — non visible depuis le repo, aucune migration versionnée). Bloquait toute insertion d'équipe I/J. Étendue à `A`-`J`.
- **`live_matches.type` a une clé étrangère vers `steps.id`** (non documentée dans le repo) : les 5 nouvelles lignes `steps` sont donc *obligatoires* avant de pouvoir générer les finales classées, pas juste "recommandées". Ajoutées.
- **Erreurs silencieuses** sur les `insert` de `confirmAndCreateTournament` (`live_teams`, `live_matches`) — aucune vérification d'erreur avant, donc un échec (ex: contrainte CHECK) passait inaperçu et redirigeait quand même vers `/live/poules` avec zéro match. Ajout de `if (error) throw ...` sur les deux inserts.
- **Liens de navigation statiques** ("suivant"/"précédent") pointant en dur vers `/live/demi` dans `poules/page.tsx` et `finale/page.tsx`, jamais adaptés au format. Rendus conditionnels.
- **Libellés peu lisibles** des finales 10 équipes → colonne `steps.label` (cf. point 8 ci-dessus).

## Vérification

1. **Non-régression format classique** : lancer un tournoi complet en format `'classique'` de bout en bout et vérifier que rien n'a changé visuellement/fonctionnellement.
2. **Format 10 équipes** : lancer un tournoi test (10 équipes/20 joueurs), vérifier poules (10 matchs/poule), bifurcation directe vers les finales classées (pas de page Demi), 5 finales 1er×1er...5e×5e avec libellés lisibles, podium classant les 10 équipes de 1 à 10 sans collision, sections "Demis" masquées partout.
3. Confirmer que le RPC `reset_tournament` a bien été corrigé pour remettre `format = 'classique'` après un reset.

## Reste à faire

- [ ] Test end-to-end complet du format 10 équipes jusqu'au podium (en cours par l'utilisateur).
- [ ] Confirmer le fix du RPC `reset_tournament` (format) appliqué côté Supabase.
- [ ] Décider si un commit/push sur la branche `feature/format-10-equipes` est fait maintenant ou après validation complète.
