# Tableau de Bord

**Propriétaire :** e-Coucou
**Statut :** En cours - Phase de structuration
**Accès :** Page réservée aux membres "Super" uniquement

---

## 🔴 PRIORITÉS CRITIQUES
- [ ] **Super :** Corriger la page visualisation charte graphique. Le bouton retour est a remplacer par X : `/live/charte/page.tsx`. En plus le bouton retour revient à la page d'accueil au lieu de `/live/super` ! *(toujours ouvert)*
- [ ] **Data :** Vérifier l'intégrité des schémas de base de données pour la version 2026.
- [ ] **Sécurité :** Vérifier les policies RLS de `activity_logs`, `photos_import` et la fonction `get_popularity_stats` dans un schéma SQL versionné (rien n'est commité à ce jour, tout vit dans le dashboard Supabase).

## 🛠️ EN COURS (Sprint Actuel)
- [ ] **3D Résidence :** `app/(sections)/render/page.tsx` et `data/residence.ts` très avancés (appartements, piscine, terrain de boules, joueurs stylisés) mais **toujours non commités** — reprendre et committer quand la modélisation sera jugée complète.
- [ ] **Photos :** Prévoir une politique de rétention/migration pour les photos uploadées avant l'introduction du système vignette + version complète (chemin plat, non listées par la galerie actuelle).

## 🕒 BACKLOG
- [ ] **UI :** Étendre la case à cocher "Favoris" au-delà de la fiche joueur (`/joueurs/[id]`) — actuellement la seule page qui l'expose.
- [ ] **Communication :** Système de push messages exclusif aux admins et super, avec affichage sur la première page.
- [ ] **Documentation :** Générer un fichier `notes.md` basé sur le `README.md` et les logs de commit GitHub.
- [ ] **Nettoyage :** Supprimer les fichiers morts non importés nulle part : `PredictionModal-bayer.tsx`, `PredictionModal-cp1.tsx`, `PredictionModal-cp2.tsx`, `Logo_anc.tsx`.
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
