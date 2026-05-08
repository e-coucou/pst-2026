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
