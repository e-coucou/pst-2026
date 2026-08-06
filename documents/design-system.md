# Design System — PST 2026

> Ce document décrit le langage visuel **tel qu'il est réellement implémenté** dans le code (`app/`, `components/`), pas une charte aspirationnelle. Une charte plus narrative existe déjà à la racine du projet (`charte.md`, consultable dans l'app via `/live/charte`) : elle décrit une intention de design system avec tokens nommés (`pst-red`, `rounded-card`, etc.) qui **ne sont pas utilisés dans le code actuel** — l'implémentation réelle applique directement les utilitaires Tailwind bruts (`bg-red-600`, `rounded-3xl`...). Ce document fait foi pour tout nouveau développement ; voir la dernière section pour le détail des écarts.

---

## 1. Identité visuelle

Esthétique **sombre, sportive et premium** : fond noir quasi-total, un seul accent chromatique fort (rouge), typographie en capitales condensées et italiques pour un ton "club officiel / affichage de stade".

Principe de hiérarchie observé dans tout le code :
1. **Fond** — noir (`bg-black`) ou zinc très sombre en overlay (`bg-zinc-900/50`, `bg-zinc-800/40`)
2. **Accent d'action** — rouge (`red-600`) : titres clés, boutons primaires, indicateurs actifs/live
3. **Texte** — blanc pour le contenu principal, zinc-400/500/600 pour le support
4. **Accents secondaires contextuels** — violet (données "Modern ELO", pointeurs), orange (tireurs), vert (statut connecté/victoire), jaune (badge Finale)

---

## 2. Palette de couleurs (usage réel relevé dans le code)

### Neutres
| Usage | Classe |
|---|---|
| Fond principal | `bg-black` |
| Panel / carte | `bg-zinc-900/50`, `bg-zinc-900/40`, `bg-zinc-800/50`, `bg-zinc-800/40` |
| Overlay modale | `bg-black/90 backdrop-blur-md`, `bg-black/95` |
| Bordures subtiles | `border-white/5`, `border-white/10` |
| Texte secondaire | `text-zinc-300`, `text-zinc-400`, `text-zinc-500` |
| Icône neutre | `bg-zinc-700` |

### Rouge — accent primaire ("Saint-Tropez")
| Usage | Classe |
|---|---|
| Accent de titre, bordure active | `text-red-600` / `border-red-600` |
| Fond bouton/pill | `bg-red-600/10` (repos) → `bg-red-600` (hover/actif) |
| Hover carte principale | `hover:bg-red-900 hover:border-red-600` |
| Halo décoratif (blur) | `bg-red-600/10 blur-[120px]` (héros), `blur-3xl` (modales) |
| Glow / ombre lumineuse | `shadow-[0_0_15px_rgba(220,38,38,0.4)]`, `drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]` |

### Accents secondaires
| Couleur | Usage |
|---|---|
| `purple-500/600` | Données "Modern ELO", rôle Pointeur, indicateur live secondaire |
| `orange-400/500` | Rôle Tireur |
| `green-500` | Session active, victoire, delta ELO positif |
| `yellow-500` | Badge "Finale" (sur fond noir texte) |
| Rouge (`red-500`) | Delta ELO négatif, défaite |

> Il n'existe pas de token nommé (`--color-red`, `pst-red`, etc.) : chaque composant utilise l'échelle Tailwind par défaut directement.

### Exceptions documentées (hors palette core)

Deux usages sortent volontairement de la palette rouge/violet/orange/vert/jaune ci-dessus — à ne pas étendre à d'autres cas sans revoir cette section :

- **Tags de catégorie (résidence)** — `render/contacts`, `render/lots` : bleu/cyan/ambre/émeraude/violet utilisés uniquement pour distinguer visuellement des catégories (gardien, studio, partie commune...) quand la palette à 5 couleurs ne suffit pas à différencier 5-7 valeurs. Jamais utilisés pour un état actif/primaire — un bouton "actif"/"sélectionné" reste toujours rouge (`bg-red-600`), quelle que soit la page.
- **Info neutre** — `params_elo/page.tsx` : bleu réservé aux encadrés d'information non actionnable (icône `Info` + texte explicatif). Cas unique, à ne pas généraliser.
- **Palmarès distinctif** — `stats/page.tsx` (onglet Records) : chaque carte-record (Diplomate, Punching-Ball, Serial Vainqueur...) a une couleur dédiée (cyan/rose/ambre...) pour se différencier visuellement des autres trophées sur la même page. Famille neutre toujours `zinc`, jamais `slate`/`gray`.

---

## 3. Typographie

Aucune police custom n'est réellement importée dans l'usage courant du texte : `globals.css` déclare `ui-sans-serif, system-ui, ...` comme pile système. `layout.tsx` charge bien `Geist`/`Geist_Mono` (variables CSS `--font-geist-sans/mono`) mais celles-ci ne sont pas branchées à `font-sans` dans le thème Tailwind — le texte visible utilise donc la police système, pas Geist.

### Échelle observée
| Rôle | Classes typiques |
|---|---|
| Hero (accueil) | `text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.8]` |
| Titre de section | `text-4xl md:text-5xl font-black uppercase italic tracking-tighter` |
| Titre de carte | `text-xl font-black uppercase italic tracking-tighter` |
| Corps de texte | `text-sm` / `text-base`, `text-gray-300`/`text-zinc-400`, `leading-relaxed` |
| Label / micro-badge | `text-[8px]` à `text-[11px]`, `font-black uppercase tracking-widest` ou `tracking-[0.2em]`/`tracking-[0.3em]`/`tracking-[0.4em]` |
| Chiffres clés (ELO, scores) | `font-mono font-black italic` |

**Règles constantes** :
- Les titres sont systématiquement `italic` + `uppercase` + `font-black` (900).
- Les labels/micro-textes utilisent `tracking-widest` ou plus large, jamais de texte < 10px sans `font-black` (lisibilité).
- Les chiffres (ELO, scores, stats) sont en `font-mono` pour l'alignement visuel façon tableau de bord.

---

## 4. Layout & grille

- **Conteneur** : `max-w-7xl mx-auto` (pages larges type accueil/nav), `max-w-5xl`/`max-w-4xl` pour du contenu éditorial (concept, régles ELO), `max-w-3xl`/`max-w-md` pour les modales.
- **Padding horizontal** : `px-4` (mobile) → `px-6`/`px-12` (desktop).
- **Sections** : `py-20` standard, `py-32` pour un hero, séparateur `border-t border-white/5`.
- **Grilles responsives** : `grid grid-cols-1 md:grid-cols-2` (2 colonnes) ou `sm:grid-cols-3` (cartes accueil), `grid-cols-12` (lignes de type tableau dans `SeasonHistory`).

---

## 5. Composants récurrents

### Carte de navigation (accueil)
```jsx
<div className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl
                hover:bg-red-900 hover:border-red-600 transition-all duration-500">
  <div className="bg-zinc-700 p-4 rounded-2xl mb-6
                  group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500">
    <Icon size={28} className="text-white" />
  </div>
  ...
</div>
```
Motif constant : icône dans un badge carré arrondi qui **grossit et change de couleur** au survol (`group-hover:scale-[1.6]`), jamais l'inverse (la carte elle-même ne grossit pas).

### Carte "info" (sections secondaires)
Même squelette mais `rounded-[2.5rem]` et fond plus discret (`bg-zinc-800/40 border-white/5`), avec une couleur d'accent variable selon le contexte (rouge/violet/gris) portée par `hover:border-{color} hover:bg-{color}/30`.

### Badge / pill
```jsx
<div className="w-fit flex items-center bg-zinc-900 border border-red-600/30
                text-white rounded-full px-5 py-2">
```
`rounded-full` systématique pour tout élément "statut" (badge live, tag rôle, bouton pill).

### Bouton primaire
```jsx
className="text-[10px] font-black uppercase tracking-widest
           bg-red-600/10 text-red-600 px-4 py-2 rounded-full
           border border-red-600/20
           hover:bg-red-600 hover:text-white transition-all"
```

### Stepper de progression (`components/Stepper.tsx`)
Rond numéroté (état : à venir = `zinc-800`, passé = `purple-500` avec ✓, courant = `red-600` + `ring-4 ring-red-600/20 scale-110`), relié par une barre qui se remplit (`w-0` → `w-full`, `duration-1000`).

### Modale (`PredictionModal`, etc.)
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
  <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden">
```
Toujours un halo décoratif flouté en fond (`absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl`).

### Graphiques (Recharts)
Convention commune à `EloChart` / `GlobalProgressionChart` / `stats/page.tsx` :
- Fond de tooltip `#09090b`, bordure `rgba(255,255,255,0.1)`, coins `rounded-xl`/`rounded-2xl`, texte `uppercase font-bold`.
- Grille `CartesianGrid` très discrète (`stroke="#1f2937"` ou blanc à `opacity: 0.03`), jamais d'axe X visible sur les timelines (`hide`).
- Rouge `#dc2626` pour ELO Classic, violet `#a855f7` pour ELO Modern — cohérent avec la palette Tailwind (`red-600`/`purple-500`).

---

## 5bis. Contraste des gris — règle appliquée

`text-zinc-600`/`700`/`800` (et équivalents `gray-600`, `slate-600`/`800`) sont **trop sombres sur fond noir pur** (contraste WCAG ≈ 2.7:1, sous le seuil AA). Corrigé sur l'ensemble du code (~83 occurrences, 32 fichiers) : `600/700` → `400`, `800` → `500`. `text-zinc-400`/`500` restent la référence pour un texte secondaire lisible sur `bg-black`.

Piège identifié : une classe `opacity-XX` posée **par-dessus** une couleur déjà correcte peut annuler le gain de contraste (les deux effets se cumulent). Préférer fixer directement une couleur suffisamment claire plutôt que réduire l'opacité d'une couleur foncée pour "l'estomper".

## 5ter. Feedback global (chargement & tactile)

Deux mécanismes posés une fois pour toute l'app, sans instrumenter chaque page :

- **Retour tactile** (`app/globals.css`) : `button:active, a:active, [role="button"]:active { transform: scale(0.96); }`, spécificité volontairement basse — toute classe `active:*` déjà présente sur un composant prend le dessus sans conflit.
- **Barre de chargement globale** (`components/GlobalLoadingBar.tsx`) : fine barre rouge en haut de l'écran, visible dès qu'une requête Supabase est en vol (compteur branché sur le `fetch` custom du client navigateur, pas de logique par page).
- **Focus clavier** (`app/globals.css`) : `:focus-visible { outline: 2px solid #dc2626; outline-offset: 2px; }`, actif uniquement en navigation clavier (souris/tactile non concernés).

### États "page en chargement" — deux registres volontaires selon la famille de page

- **Pages de données** (`render/*`, `live/(super)/*`) : spinner plein écran centré, sans texte — `<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="text-red-600 animate-spin" size={40} /></div>`.
- **Pages de pilotage de match en direct** (`live/(admin)/{poules,ronde,demi,finale,admin}`) et `stats` : texte seul qui pulse, sans icône — `font-black animate-pulse italic uppercase` (ex. `"CHARGEMENT..."`). Choix volontaire pour rester lisible sur un écran de terrain regardé de loin.
- Dans les deux familles, le **loading d'une action locale** (bouton "Enregistrer", "Actualiser"...) reste toujours `Loader2` + `animate-spin` en petite taille, remplaçant l'icône habituelle du bouton — c'est le seul registre 100% uniforme du projet, à réutiliser par défaut pour tout nouveau bouton asynchrone.

### État "aucune donnée" — référence

Texte centré discret, sans icône : `text-zinc-400 font-black uppercase tracking-widest` (ex. `"Aucun X trouvé/enregistré."`). À utiliser systématiquement en garde après un `.map()` qui peut produire une liste vide, y compris côté Server Component.
- **Vague de lumière douce** (vignettes `RecordCard` de `/stats`) : bande diagonale animée qui traverse la carte en fondu, couleur dérivée de la classe `text-{couleur}-{nuance}` déjà passée à la carte (variables CSS de palette Tailwind v4, `var(--color-orange-500)` etc.) — pas de configuration par carte.

## 6. Animations & interactions

| Effet | Classe | Usage |
|---|---|---|
| Pulsation | `animate-pulse` | Statuts live, valeurs qui changent en temps réel |
| Ping (halo) | `animate-ping` | Point de statut actif (nav, badges) |
| Rotation | `animate-spin` (avec `Loader2`) | Chargement |
| Grossissement au survol | `group-hover:scale-[1.6]` | Icônes dans les cartes |
| Transition standard | `transition-all duration-300` | Boutons, toggles |
| Transition lente ("premium") | `transition-all duration-500` | Cartes, hover complexe |
| Remplissage progressif | `transition-all duration-1000` | Barres du Stepper |
| Entrée de menu | `animate-in slide-in-from-top duration-300` | Menu mobile |

---

## 7. Iconographie

Exclusivement **Lucide React** (`lucide-react`). Tailles observées : 12–16px (labels/inline), 20–28px (icônes de carte/nav), 40–48px (états de chargement/héros). La couleur de l'icône hérite systématiquement de l'accent contextuel de son bloc parent (rouge pour ELO/action, violet pour Modern/Pointeur, orange pour Tireur).

---

## 8. Accessibilité — état réel

- Contraste texte/fond : conforme de fait (blanc/noir, rouge-600 sur noir ≈ 5.2:1) grâce à la palette réduite, mais **non vérifié par un outil automatisé** dans le projet.
- **`*:focus-visible` n'a pas de style dédié dans `globals.css` actuel** (contrairement à ce que documente `charte.md`) — à ajouter si l'accessibilité clavier doit être garantie.
- Peu d'attributs `aria-*` dans les composants interactifs actuels (boutons icône-only comme `FavoriteButton`, burger menu) — à auditer avant mise en production élargie.
- Cible tactile : globalement respectée (`p-2`/`p-3`/`p-4` sur les boutons icône), non vérifiée systématiquement.

---

## 9. Écarts entre la documentation existante (`charte.md`) et l'implémentation

| Charte.md (intention) | Réalité du code |
|---|---|
| Couleurs nommées `pst-black`/`pst-white`/`pst-red` dans `tailwind.config.ts` | Non présentes — 0 occurrence dans `app/` ou `components/` ; tout est en `red-600`/`black`/`zinc-*` bruts |
| `borderRadius.card = 1.75rem` (`rounded-card`) | Non utilisé — chaque composant écrit `rounded-3xl`/`rounded-[2.5rem]` explicitement |
| `globals.css` avec règle `*:focus-visible { outline-red-600 }` | Absente du fichier réel |
| Composants génériques `Button.tsx` / `Card.tsx` proposés en exemple | N'existent pas dans `/components` — chaque page réécrit son propre balisage Tailwind inline |
| `tailwind.config.ts` "optimisé" avec `content` pointant `app/`+`components/` uniquement | Le `tailwind.config.ts` réel à la racine référence aussi `./pages/**/*` (obsolète, pas de dossier `pages/`) et charge `@tailwindcss/typography` (utilisé par `MarkdownDisplay.tsx` via `prose prose-invert`) |

**Recommandation** : si l'objectif est de factoriser le design system, extraire `Button`/`Card`/`Badge` en composants réels serait le premier gain (actuellement dupliqués textuellement dans une dizaine de fichiers), et resynchroniser `charte.md` avec le code plutôt que l'inverse.
