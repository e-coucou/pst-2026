# Tableau de Bord

**Propriétaire :** e-Coucou
**Statut :** En cours - Phase de structuration
**Accès :** Page réservée aux membres "Super" uniquement

---

## 🔴 PRIORITÉS CRITIQUES
- [ ] **Data :** Vérifier l'intégrité des schémas de base de données pour la version 2026.
- [ ] **Sécurité :** Vérifier les policies RLS de `activity_logs`, `photos_import` et la fonction `get_popularity_stats` dans un schéma SQL versionné (rien n'est commité à ce jour, tout vit dans le dashboard Supabase).
- [ ] **Live :** Graphique ELO en bas de `/app/live` — le tooltip ne fonctionne pas correctement. Mis de côté pour l'instant.
- [ ] **Sécurité :** `lib/auth-actions.ts` non importé nulle part (`verifyInvitationCode` semble remplacée par le RPC Supabase `verify_invitation_code`, `isAdmin` inutilisée aussi) — **à revérifier avant suppression**, sujet sensible car même thématique que la faille d'inscription Google OAuth déjà corrigée (code d'invitation non revérifié côté serveur). Ne pas supprimer tant que ce point n'est pas confirmé.

## 🛠️ EN COURS (Sprint Actuel)
- [ ] **Archivage :** À la fin du tournoi 2026, l'archivage de la saison (`teams`/`games`, page `tournois/[year]`) devra gérer le format utilisé — 3 formats coexistent désormais : `classique` (8 équipes + demies + 4 finales), `10_equipes` (2 poules de 5 + 5 finales classées) et `ronde` (système suisse 4 rondes + 5 finales classées, cf. `documents/rondes.md`) — les années auront des structures différentes selon le format choisi. Pas encore traité, à reprendre après la fin du tournoi 2026.
- [ ] **3D Résidence :** `app/(sections)/render/page.tsx` et `data/residence.ts` très avancés (appartements, piscine, terrain de boules, joueurs stylisés) mais **toujours non commités** — reprendre et committer quand la modélisation sera jugée complète.
- [ ] **Photos :** Prévoir une politique de rétention/migration pour les photos uploadées avant l'introduction du système vignette + version complète (chemin plat, non listées par la galerie actuelle).

## 🕒 BACKLOG
- [ ] **Communication :** Système de push messages exclusif aux admins et super, avec affichage sur la première page.
- [ ] **Documentation :** Générer un fichier `notes.md` basé sur le `README.md` et les logs de commit GitHub.
- [ ] **Vidéos :** Tracking "vidéo lue" mis de côté (contrainte iframe YouTube cross-origin — nécessiterait l'API IFrame officielle de YouTube, hors scope pour l'instant).
- [ ] **Stockage :** Suivre l'usage du bucket `photos_import` (quota 1 Go / plan Supabase free) à mesure que la galerie grossit.

## 💡 BOÎTE À IDÉES (V2 / Futur)
- [ ] Système de commentaires internes sur les tâches pour les futurs collaborateurs (si extension).
- [ ] Export PDF automatique des rapports de progression.
- [ ] "Qui est en ligne" en vrai temps réel (Supabase Realtime Presence) plutôt que fenêtre glissante de 1h basée sur `activity_logs` — plus précis mais demande de brancher un canal de présence sur toute l'app.

---

##  IDÉES ABANDONNEES
- [ ] Optimisation des performances de chargement pour les gros volumes de données.
- [ ] Mise en place du système de backup automatisé.

---

## ✅ RÉALISATIONS
- [x] **Super :** Corrigé le bouton retour de `/live/charte` — icône X (au lieu du lien texte "Retour"), renvoie vers `/live/super` (au lieu de l'accueil).
- [x] **Admin** Créer la page d'administration des utilisateurs (table `site_users` Supabase) avec gestion des rôles (membre/admin/super) accessible uniquement par les "super".
- [x] **API/TODO&CHART** Développer l'endpoint `/api/dev/todo` pour lire le fichier MD local, done egalement pour la charte
- [x] **R/2026** Ajouter à la table `site_users` une relation avec le joueur préféré (tables `profiles` et `live_selected`). Colonne `favoris` créée dans `site_users` avec foreign_key vers `profiles`
- [x] **5/2026** Implémenter le middleware de restriction pour la page `/admin/todo` (accès réservé aux `super-members`).
- [x] **5/2026** Créer la page interne d'affichage du `TODO.md` (via `marked` ou `react-markdown`).
- [x] Choix de la stack technique (JS/MD).
- [x] Configuration du dépôt GitHub.
- [x] Connexion Google Keep <=> Flux de travail.
- [x] **Live :** Case à cocher "confirmé/payé" sur la sélection de joueurs (`live_selected.confirmed`), conservée entre déselection/reselection, remise à zéro par `reset_tournament`.
- [x] **Accueil :** Bandeau adaptatif date de l'événement (à venir / rappel si non-confirmés / programme du jour si tout le monde a confirmé / masqué après l'événement).
- [x] **Sécurité :** Comblé la faille d'inscription Google OAuth — le code d'invitation n'était vérifié que côté client et jamais recontrôlé au retour d'auth. Revérification serveur dans `auth/callback/route.ts`, suppression du compte non autorisé si invalide.
- [x] **Logs :** `session_logging` (connexions/déconnexions) déjà en place via `session_logs`.
- [x] **Métriques :** Système d'audit log complet — table `activity_logs`, helper `logActivity` (exclut le rôle super), tracking automatique des pages vues (`PageViewTracker`) et des actions admin/favoris/photos, page `/live/activity` (journal filtrable par section) et `/live/online` (qui est en ligne, fenêtre 1h).
- [x] **Stats :** Onglet "Popularité" (page/joueurs/tournoi/photo les plus consultés, via RPC `get_popularity_stats`), nouvelles vignettes records (points marqués/encaissés, fanny infligées/subies, victoires/défaites/nuls, défaites sur le fil), tri stable par winrate (bug de mutation d'array corrigé), effet de vague de lumière sur les vignettes.
- [x] **Médiathèque :** Restructuration `/videos` en hub (Vidéos/Photos/Contribuez) + galerie photo alimentée par les membres avec upload compressé (WebP, ~1,5 Mo, conversion côté navigateur) et miniatures dédiées pour limiter la bande passante.
- [x] **UI :** Navbar mobile passée en icônes (burger supprimé), barre de chargement globale, feedback tactile CSS global, correction des contrastes de gris trop sombres sur l'ensemble de l'app.
- [x] **Résidence :** Rapprochement nom/lot du Bâtiment B entre `data/residence.ts` et la convocation d'AG (`documents/private/`, non commité).
- [x] **Live :** Tableau de palmarès/résultats de poules unifié sur toutes les pages (poules, finale, podium, live public, archives `tournois/[year]`) via un composant partagé `PouleStandingsTable` + utilitaire `calculatePouleStandings` — colonnes V/D/N, Pour/Contre, Diff, Pts identiques partout (au lieu de versions "mini" appauvries ailleurs que sur la page poules).
- [x] **UI :** Cohérence tireur=orange/pointeur=violet appliquée sur ~10 fichiers (tournois, stats, SeasonHistory, tout le cycle live admin, PredictionModal, admin_teams) — plusieurs endroits affichaient les noms sans couleur ou avec une couleur incorrecte (rouge/blanc/bleu).
- [x] **Nettoyage :** Suppression des fichiers morts confirmés (audit du 27/07, 32 fichiers de `components/lib/utils/hooks` vérifiés un par un) : `PredictionModal-bayer.tsx`, `PredictionModal-cp1.tsx`, `PredictionModal-cp2.tsx`, `Logo_anc.tsx`, `AdminSettings.tsx`. `lib/auth-actions.ts` volontairement conservé pour revérification sécurité (cf. Priorités Critiques).
- [x] **Favoris :** Étoile favori (`components/FavoriStar.tsx` + `utils/favori.ts` serveur + `hooks/useFavoriId.ts` client) étendue à ~12 pages où un nom de joueur apparaît (au-delà de la seule fiche joueur) : stats, tournois, cycle live admin, admin_joueurs, GlobalProgressionChart. Non traité : `SeasonHistory.tsx` (le nom du partenaire n'a pas d'id de profil disponible dans les données actuelles) et les `<option>` natifs d'`admin_teams` (impossible d'y insérer une icône).
- [x] **Live :** Format **Ronde** (système suisse) ajouté comme 3ème option de tournoi à 10 équipes, à côté de `classique` et `10_equipes` — 4 rondes appariées par classement (anti-rematch), puis une 5ème ronde de finales classées réutilisant le mécanisme des finales du format `10_equipes` (types `Finale Rang1..5`, bonus ELO "Finale" hérité automatiquement). Nouvelle page `/live/ronde`, `Stepper.tsx` refactoré (`skipDemi` → `format`, pilote la liste d'étapes pour les 3 formats). Détail complet : `documents/rondes.md`. Mergé (PR #2).
- [x] **Live/Test :** Bouton "Simuler" (super admins) sur poules/demi/finale/ronde — remplit les matchs non terminés avec des scores aléatoires via le pipeline ELO normal (`utils/simulate.ts`), mode gaussien avec nuls autorisés pour les poules/rondes, mode décisif (13 pts) pour demis/finales. Nouveau hook `hooks/useIsSuper.ts`.
- [x] **Sécurité :** Réinitialisation de mot de passe pour les comptes pseudo `@pst.net` (`/reset-password`, `app/api/auth/reset-password/route.ts`) — le flux standard Supabase par email est inutilisable (adresse synthétique, pas de vraie boîte mail). Vérification par le code d'invitation existant (RPC `verify_invitation_code`, réutilisé) puis `admin.auth.admin.updateUserById`. **Point d'attention accepté** : le code d'invitation est partagé par tous les membres, donc n'importe qui le connaissant peut réinitialiser le mot de passe d'un autre membre s'il connaît son pseudo — risque jugé acceptable vu le contexte (club fermé), tracé via un log d'audit (`session_logs`/`PASSWORD_RESET`, visible dans `/live/activity`). Pas de rate-limiting. À revoir si le club grossit ou si un abus est constaté.
