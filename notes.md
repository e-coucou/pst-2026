version 1.8.11

# 📓 Journal de Développement - Projet Pétanque PST

## 🏗️ Architecture & Flux de Données

### 🔄 Gestion des États (Stepper)
- **Fichier :** `components/TournamentStepper.tsx`
- **Concept :** Un composant de progression qui synchronise l'interface avec l'état réel du tournoi en base de données.
- **Points clés :**
    - Les étapes : `JOUEURS`, `EQUIPES`, `POULES`, `DEMI`, `FINALE`, `TERMINE`.
    - **Sécurité :** Utilisation de `key={status}` lors de l'appel du composant pour forcer un re-montage propre et éviter les bugs d'affichage "undefined".
    - **UI :** Animation de remplissage des barres de progression via Tailwind (`transition-all duration-1000`).

### ⚡ Client vs Server Components (Hybridation)
- **Page Profil Joueur :** Reste un **Server Component** (`async function`) pour la rapidité de récupération des données Supabase (ELO, Historique, Stats).
- **Interactivité :** Extraction des éléments cliquables dans des fichiers séparés avec la directive `'use client';`.
- **Exemple :** Le bouton de favoris a été isolé pour permettre le `onClick` sans casser le rendu serveur de la page.

## ⭐️ Système de Favoris

### 🛠️ Implémentation technique
- **Composant :** `FavoriteButton.tsx`
- **Mécanisme :** 1. Clic sur l'étoile -> Appel `supabase.from('site_users').update()`.
    2. Si succès -> `router.refresh()` est appelé.
    3. **Impact :** Le `router.refresh()` force Next.js à re-fetch les données sur le serveur, ce qui met à jour instantanément la liste de classement et déplace la vignette "favori" sans recharger la page.

### 🔐 Sécurité & Base de données (RLS)
- **Table :** `site_users`
- **Policy UPDATE :** Indispensable pour permettre l'écriture.
    - *Règle SQL :* `auth.uid() = id` (L'utilisateur ne peut modifier que sa propre ligne).
- **Type de données :** Attention à la correspondance entre l'ID du joueur (`int8`) et le champ `favoris` dans la table users.

## 📱 Optimisations UI / Responsive

### 📏 Tailwind Breakpoints
- **Masquage sélectif :** Utilisation de `hidden md:block` pour épurer l'affichage mobile.
- **Exemple :** Les labels "ELO" sont masqués sur smartphone pour laisser plus de place aux chiffres, mais réapparaissent sur tablette/desktop.

### 🎨 Design System (Codes Couleurs)
- **Accent principal :** `red-600` (PST Brand).
- **Fond :** `black` & `zinc-900`.
- **Typo :** Italique, Black, Uppercase pour le look "Athlète Pro".

## 🚩 Mémo Erreurs Résolues
1. **Error: Event handlers cannot be passed to Client Component props**
    - *Cause :* Tentative d'utiliser `onClick` dans un Server Component.
    - *Solution :* Création d'un composant enfant avec `'use client';`.
2. **Nom de composant en minuscule :**
    - *Cause :* `<renderStepper />` n'était pas reconnu par React.
    - *Solution :* Renommé en `<TournamentStepper />` (PascalCase).
3. **Update réussie mais pas de changement en DB :**
    - *Cause :* Manque de Policy `UPDATE` dans Supabase.
    - *Solution :* Ajout de la règle RLS dans le SQL Editor.

---
version 1.8.4

# 📝 PST-2026 : Notes de Session - Gestion Admin & Sécurité

Cette session a porté sur la mise en place du panneau d'administration des membres et la fiabilisation des politiques de sécurité (RLS) sur Supabase.

## 1. Résolution du Bug de Récursion (Erreur 42P17)
L'application bloquait lors de l'accès à la table `site_users` à cause d'une boucle infinie dans les politiques de sécurité.

- **Cause :** La politique RLS appelait la fonction `is_super()`, qui elle-même interrogeait `site_users`.
- **Solution SQL :** - Passage de la fonction `is_super()` en mode `SECURITY DEFINER`. Cela permet à la fonction d'ignorer la RLS lors de sa vérification interne.
    - Nettoyage des anciennes politiques (6 au total) pour repartir sur une base saine de 3 politiques simplifiées.
- **État final :** Les "Supers" ont un accès total (`ALL`), tandis que les membres ne peuvent voir que leur propre ligne (`SELECT`).

## 2. Interface Super-Admin (`/live/(super)/super/page.tsx`)
Création d'une page de gestion des accès haut de gamme respectant la charte **PST-2026**.

- **Fonctionnalités :**
    - Tableau de bord listant tous les membres inscrits.
    - **Gestion des Rôles :** Changement dynamique via un select stylisé.
        - `super` : Rouge PST (verrouillé pour éviter l'auto-rétrogradation).
        - `admin` : Orange.
        - `membre` : Purple.
    - **Liaison Profils :** Menu déroulant pour lier un compte utilisateur à un profil de joueur (table `profiles`).
- **UI/UX :** - Design minimaliste sur fond noir profond.
    - En-tête avec badge "LIVE 2026" et icônes Lucide.
    - Bouton de retour (X) vers le menu Super-Admin.

## 3. Système de Traçabilité & Audit
Intégration d'un logging automatique pour sécuriser les actions administratives.

- **Fonction `updateField` :**
    - Utilisation des *Template Literals* (backticks `` ` ``) pour des messages de logs dynamiques.
    - **Sécurité RLS :** Le log est enregistré sous l'ID de l'administrateur connecté (`user.id`) pour valider la politique `Enable insert for own logs`.
- **Exemple de log :** `ADMIN_UPDATE_MEMBER : Changement de Rôle pour ricky -> admin`.

## 4. Schéma de la table `site_users`
Rappel de la structure actuelle :
- `id` (uuid, PK)
- `nickname` (text, unique)
- `role` (membre | admin | super)
- `favoris` (FK vers profiles.id)
- `last_login` (timestamp)
- `email` (text)

---

version 1.8.3

# 📝 Notes d'Intégration : Système de Logs (PST-2026)

Cette étape a consisté à sécuriser et à fiabiliser le système de traçabilité des connexions pour l'application **Paris Saint-Tropez 2026**.

## 1. Problématique Initiale
L'erreur `42501` sur la table `session_logs` indiquait une violation de la **Row Level Security (RLS)**. La politique précédente essayait de comparer l'ID du log avec l'ID de l'utilisateur (`auth.uid() = id`), ce qui est impossible puisque l'ID du log est un UUID auto-généré unique à chaque entrée.

## 2. Évolutions du Schéma de Données
Pour lier correctement un log à un joueur tout en respectant la RLS :
* **Ajout de `user_id`** : Une nouvelle colonne `uuid` référençant `auth.users(id)` a été ajoutée à la table `session_logs`.
* **Mise à jour de la RLS** : Création d'une politique `Enable insert for own logs` basée sur la condition `auth.uid() = user_id`.

## 3. Modifications Applicatives

### Login Classique (`login/page.tsx`)
* Mise à jour de la fonction `logActivity` pour accepter un paramètre optionnel `userId`.
* Capture de l'ID utilisateur via `data.user?.id` après un succès de `signInWithPassword`.
* Envoi systématique de l'ID au logger pour valider l'insertion en base.

### Login Google OAuth (`auth/callback/route.ts`)
* Obligation de gérer le log côté serveur (Node.js/Next.js Runtime).
* Utilisation de `exchangeCodeForSession` pour obtenir l'utilisateur.
* Insertion du log `LOGIN_GOOGLE_SUCCESS` avec le `user_id` et le `full_name` issu des métadonnées Google.

### Logout
* Intégration dans `session_logs`des activités de déconnexions. soit par l'URL /logout soit depuis la `/components/Navbar.tsx`

## 4. Respect de la Charte Graphique
* **Typographie** : Les actions sont enregistrées en `UPPERCASE` pour correspondre aux styles des labels de la charte (`text-[10px] font-black`).
* **Cohérence** : Utilisation du `player_nickname` (en minuscules) pour l'affichage futur dans le flux "Live".
