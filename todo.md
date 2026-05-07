# Tableau de Bord

> **Propriétaire :** e-Coucou
> **Statut :** En cours - Phase de structuration
> **Accès :** Page réservée aux membres "Super" uniquement

---

## 🔴 PRIORITÉS CRITIQUES
- [ ] **Data :** Vérifier l'intégrité des schémas de base de données pour la version 2026.
- [ ] **Admin :** Créer la page d'administration des utilisateurs (table `site_users` Supabase) avec gestion des rôles (membre/admin/super) accessible uniquement par les "super".

## 🛠️ EN COURS (Sprint Actuel)
- [ ] **API :** Développer l'endpoint `/api/dev/get-todo` pour lire le fichier MD local.
- [ ] **UI :** Mise en place d'un layout "Dark Mode" pour le dashboard admin.

## 🕒 BACKLOG
- [ ] **Logs :** Activer `session_logging` pour le suivi des connexions et déconnexions utilisateurs.
- [ ] **Métriques :** Mettre en place un système d'audit log pour collecter les metrics d'utilisation des pages.
- [ ] **UI :** Intégrer une case à cocher "Preferred" sur l'ensemble des pages.
- [ ] **Communication :** Système de push messages exclusif aux admins et super, avec affichage sur la première page.
- [ ] **Documentation :** Générer un fichier `notes.md` basé sur le `README.md` et les logs de commit GitHub.
- [ ] **Récurrent :** Commenter les programmes dans le fichier `notes.md`.
- [ ] Optimisation des performances de chargement pour les gros volumes de données.
- [ ] Mise en place du système de backup automatisé.

## 💡 BOÎTE À IDÉES (V2 / Futur)
- [ ] Système de commentaires internes sur les tâches pour les futurs collaborateurs (si extension).
- [ ] Export PDF automatique des rapports de progression.

---

## ✅ RÉALISATIONS
- [x] **R/2026** Ajouter à la table `site_users` une relation avec le joueur préféré (tables `profiles` et `live_selected`). Colonne `favoris` créée dans `site_users` avec foreign_key vers `profiles`
- [x] **5/2026** Implémenter le middleware de restriction pour la page `/admin/todo` (accès réservé aux `super-members`).
- [x] **5/2026** Créer la page interne d'affichage du `TODO.md` (via `marked` ou `react-markdown`).
- [x] Choix de la stack technique (JS/MD).
- [x] Configuration du dépôt GitHub.
- [x] Connexion Google Keep <=> Flux de travail.
