# 🏐 CHARTE GRAPHIQUE — Paris Saint-Tropez 2026

**Tournoi Officiel de Pétanque**  
*Architecture Visuelle & Directives d'Implémentation*

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Palette de couleurs](#palette-de-couleurs)
3. [Typographie](#typographie)
4. [Structure & Layouts](#structure--layouts)
5. [Composants principaux](#composants-principaux)
6. [Animations & Transitions](#animations--transitions)
7. [Responsive Design](#responsive-design)
8. [Accessibilité](#accessibilité)
9. [Configuration Tailwind](#configuration-tailwind)
10. [Implémentation & Assets](#implémentation--assets)

---

## Vue d'ensemble

### 🎯 Identité visuelle

L'application PST-2026 adopte une **esthétique minimaliste et luxueuse** inspirée par Saint-Tropez :

- **Sophistication** : Palette noir/blanc/rouge évoque l'élégance côte d'azur
- **Dynamisme** : Animations subtiles et transitions fluides pour l'engagement utilisateur
- **Clarté** : Hiérarchie visuelle forte, navigation intuitive
- **Accessibilité** : Contraste élevé, spacing généreux, typographie lisible

### 🏷️ Principes fondamentaux

```
┌─────────────────────────────────────────┐
│         HIÉRARCHIE VISUELLE               │
├─────────────────────────────────────────┤
│ 1. FOND : Noir profond (stabilité)      │
│ 2. ACCENT : Rouge vif (action/énergie)  │
│ 3. TEXTE : Blanc pur (clarté)           │
│ 4. SUPPORT : Gris zinc (subtilité)      │
└─────────────────────────────────────────┘
```

---

## Palette de couleurs

### 🎨 Couleurs principales

#### Neutres (Domination visuelle)

| Nom | Tailwind | Hex | RGB | Utilisation |
|-----|----------|-----|-----|-------------|
| **Noir Profond** | `bg-black` | `#000000` | `0, 0, 0` | Fond principal, immersion |
| **Blanc Pur** | `text-white` | `#FFFFFF` | `255, 255, 255` | Texte principal, contrastes |
| **Zinc 900** | `bg-zinc-900` | `#18181B` | `24, 24, 27` | Cartes, panels légers |
| **Zinc 800** | `bg-zinc-800` | `#27272A` | `39, 39, 42` | Backgrounds secondaires |
| **Zinc 700** | `bg-zinc-700` | `#3F3F46` | `63, 63, 70` | Icônes, accent gris |

#### Couleur d'action (Énergie)

| Nom | Tailwind | Hex | RGB | Utilisation |
|-----|----------|-----|-----|-------------|
| **Rouge Saint-Tropez** | `text-red-600`<br/>`bg-red-600` | `#DC2626` | `220, 38, 38` | Boutons primaires, titres, accents |
| **Rouge Foncé** | `bg-red-900` | `#7F1D1D` | `127, 29, 29` | États hover, surlignages |
| **Rouge Léger** | `bg-red-600/10`<br/>`border-red-600/30` | `rgba(220, 38, 38, 0.1)`<br/>`rgba(220, 38, 38, 0.3)` | Avec opacité | Fonds subtils, bordures douces |

#### Couleurs secondaires (Accents contextuels)

| Nom | Tailwind | Utilisation |
|-----|----------|-------------|
| **Purple** | `text-purple-600` | Indicateurs live, points d'intérêt secondaires |
| **Green** | `text-green-500` | État actif, session connectée |
| **Gray** | `text-gray-500` | Texte secondaire, descriptions |

---

## Typographie

### 🔤 Hiérarchie typographique

#### Police de base

**Système sans-serif par défaut (Tailwind/System fonts)**

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

Rationale : Performance, accessibilité, lisibilité cross-platform.

#### Échelle typographique

| Niveau | Tailwind | Taille | Poids | Utilisation |
|--------|----------|--------|-------|-------------|
| **H1** | `text-8xl` | 96px | `font-black` (900) | Titres héros (page accueil) |
| **H2** | `text-5xl` | 48px | `font-black` | Titres sections principales |
| **H3** | `text-xl` | 20px | `font-black` | Titres cartes/composants |
| **Body** | `text-base` | 16px | `font-normal` | Texte paragraphe |
| **Caption** | `text-xs` / `text-[10px]` | 12px / 10px | `font-black` uppercase | Labels, badges |
| **Override** | `text-sm` | 14px | `font-bold` | Sous-titres |

#### Variantes de style

```tailwind
/* Majuscules avec espacement */
.heading {
  @apply uppercase tracking-widest italic font-black;
}

/* Texte accentué */
.accent-text {
  @apply font-black uppercase tracking-[0.2em];
}

/* Secondaire discret */
.secondary {
  @apply text-gray-500 uppercase text-xs font-bold tracking-widest;
}
```

### 📏 Espacement typographique

- **Line-height** : `leading-[0.8]` pour les titres (compact), `leading-relaxed` pour le corps
- **Letter-spacing** : `tracking-tighter` pour les titres, `tracking-widest` pour les labels
- **Italic** : Utilisé sur les titres pour l'élégance Saint-Tropez

---

## Structure & Layouts

### 🏗️ Grille principale

L'application suit une **grille 12 colonnes** (Tailwind default) avec :

- **Conteneur max** : `max-w-7xl` (80rem / 1280px)
- **Padding horizontal** : `px-6` (desktop), `px-4` (mobile)
- **Gaps** : `gap-6` (standard), `gap-8` (sections)

```jsx
<div className="max-w-7xl mx-auto px-6">
  {/* Contenu centré et constraint */}
</div>
```

### 📐 Sections standards

#### Section Hero

```jsx
<header className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto text-center">
  {/* Arrière-plan progressif optionnel */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full 
                  bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
  {/* Contenu */}
</header>
```

**Espaces** :
- **Padding vertical** : `py-20` (mobile), `py-32` (desktop)
- **Gradient arrière** : Red 600 à 10% opacité, blur 120px

#### Section standard

```jsx
<section className="max-w-5xl mx-auto px-6 py-20 border-t border-white/5">
  {/* Grille 1-3 colonnes responsive */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    {/* Cartes */}
  </div>
</section>
```

**Espaces** :
- **Padding vertical** : `py-20` (standard)
- **Border top** : `border-white/5` (séparateur subtil)

### 🎴 Cards & Panels

#### Card Standard (accueil)

```jsx
<div className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl 
                hover:bg-red-900 hover:border-red-600 transition-all duration-500">
  {/* Contenu */}
</div>
```

**Propriétés** :
- **Background** : `bg-zinc-800/50` (semi-transparent)
- **Border** : `border-white/10` (subtil), `hover:border-red-600`
- **Padding** : `p-8` (généreux)
- **Border-radius** : `rounded-3xl` (arrondi moderne)
- **Transition** : `duration-500` (lente, premium)

#### Card Info (sections)

```jsx
<div className="group bg-zinc-800/40 border border-white/5 p-8 rounded-[2.5rem] 
                hover:border-red-600 hover:bg-red-600/30 transition-all">
  {/* Contenu */}
</div>
```

**Variations** :
- Info → Red accent
- Algorithme → Purple accent
- À propos → Gray accent

---

## Composants principaux

### 🧬 Badge/Chip

**Live Status Badge** (Hero section)

```jsx
<div className="w-fit flex items-center bg-zinc-900 border border-red-600/30 
                text-white rounded-full px-5 py-2 mb-8 hover:bg-zinc-800">
  {/* Icône (Zap) + Texte */}
</div>
```

**Propriétés** :
- Pill shape : `rounded-full`
- Padding : `px-5 py-2` (compact)
- Border subtile : `border-red-600/30`

---

### 🔘 Boutons

#### Bouton primaire (S'inscrire)

```jsx
<button className="text-[10px] font-black uppercase tracking-widest 
                   bg-red-600/10 text-red-600 px-4 py-2 rounded-full 
                   border border-red-600/20 
                   hover:bg-red-600 hover:text-white transition-all">
  S'inscrire
</button>
```

**État** :
- **Normal** : Fond rouge 10% opacité, texte rouge 600
- **Hover** : Fond rouge 600, texte blanc
- **Padding** : `px-4 py-2`
- **Transition** : Simultanée background + text

#### Bouton secondaire (Liens)

```jsx
<button className="text-white hover:text-red-600 transition-colors">
  Texte du lien
</button>
```

**État** :
- **Normal** : Blanc
- **Hover** : Rouge 600

---

### 🎯 Icônes

#### Icône standard

```jsx
<div className="bg-zinc-700 p-4 rounded-2xl group-hover:scale-[1.6] 
                group-hover:bg-red-600 transition-all duration-500">
  <Trophy size={28} className="text-white" />
</div>
```

**Animation hover** :
- Scale : `scale-[1.6]` (1.6x)
- Couleur : `group-hover:bg-red-600`
- Transition : `duration-500`

#### Icône avec pulsation

```jsx
<Zap size={18} className="text-red-600 fill-red-600 animate-pulse" />
```

---

### 🏷️ Labels & Tags

#### Label primaire

```jsx
<span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
  {count} athlètes inscrits
</span>
```

**Propriétés** :
- Taille : `text-[10px]`
- Poids : `font-black`
- Espacement : `tracking-widest`
- Majuscule : `uppercase`

#### Label accentué

```jsx
<span className="text-red-600 text-xl font-bold uppercase tracking-widest animate-pulse">
  {status}
</span>
```

---

### 🔗 Navigation

#### NavLink (Desktop)

```jsx
<Link href={href} 
      className="relative flex items-center gap-2 text-[11px] font-black 
                 uppercase tracking-[0.2em] transition-all 
                 ${active ? 'text-white' : 'text-gray-500 hover:text-red-500'}">
  {active && <span className="flex h-2 w-2">
    <span className="animate-ping absolute h-2 w-2 rounded-full bg-red-100 opacity-75" />
    <span className="relative h-2 w-2 rounded-full bg-red-600" />
  </span>}
</Link>
```

**États** :
- **Actif** : Blanc + indicateur rouge pulsant
- **Inactif** : Gris 500 → Red 500 au hover
- **Icône** : Hérite l'état du lien

#### MobileNavLink

```jsx
<Link href={href}
      className="${active ? 'text-red-600' : 'text-white hover:text-red-500'} 
                  text-3xl font-black uppercase italic">
  {label}
  {active && <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />}
</Link>
```

---

## Animations & Transitions

### ⏱️ Vitesses standard

| Utilisation | Durée | Timing | Exemple |
|------------|-------|--------|---------|
| **Rapide** | `150ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, couleurs |
| **Standard** | `300ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Toggles, modales |
| **Lent** | `500ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Cartes, entrées |

### 🎬 Animations courantes

#### Pulse (Indicateurs)

```jsx
className="animate-pulse"
```

Utilisation : Statut live, indicateurs actifs, valeurs temps réel

#### Ping (Points clignotants)

```jsx
<span className="animate-ping absolute w-2 h-2 bg-red-100 opacity-75" />
<span className="relative w-2 h-2 bg-red-600" />
```

Utilisation : Points actifs en navigation, statuts live

#### Scale (Agrandissement)

```jsx
className="group-hover:scale-[1.6] transition-all duration-500"
```

Utilisation : Icônes sur cartes au hover

#### Slide-in (Menus)

```jsx
className="animate-in slide-in-from-top duration-300"
```

Utilisation : Menu mobile déroulant

#### Fade (Fond progressif)

```css
.hero-bg {
  background: linear-gradient(...);
  opacity: 0;
  animation: fadeIn 0.5s ease-in-out forwards;
}
```

---

## Responsive Design

### 📱 Breakpoints Tailwind

```tailwind
sm  → 640px   (Petits téléphones)
md  → 768px   (Tablettes, grands téléphones)
lg  → 1024px  (Petits laptops)
xl  → 1280px  (Desktops standard)
2xl → 1536px  (Grands écrans)
```

### 🔄 Patterns responsive

#### Grid adaptatif (3 colonnes → 1)

```jsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
  {/* 1 colonne mobile, 3 colonnes desktop */}
</div>
```

#### Texte adaptatif

```jsx
<h1 className="text-5xl md:text-8xl">
  {/* 48px mobile, 96px desktop */}
</h1>
```

#### Spacing adaptatif

```jsx
<header className="px-6 py-20 md:py-32">
  {/* py-20 mobile, py-32 desktop */}
</header>
```

#### Affichage conditionnel

```jsx
<div className="hidden md:flex">
  {/* Visible desktop seulement */}
</div>
```

### 📐 Considérations mobile-first

1. **Touch targets** : Min 44x44px (boutons, liens cliquables)
2. **Spacing** : Généreux sur petits écrans (`px-4`, `py-6`)
3. **Typography** : Tailles lisibles (`text-base` min)
4. **Modales** : Full-width sur mobile
5. **Images** : Responsive avec `object-cover`

---

## Accessibilité

### ♿ Standards de conformité

L'application doit respecter **WCAG 2.1 Niveau AA** minimum.

### 🎨 Contraste des couleurs

| Paire | Ratio | Statut |
|------|-------|--------|
| Blanc sur noir | 21:1 | ✅ AAA |
| Blanc sur zinc-900 | 18:1 | ✅ AAA |
| Red-600 sur noir | 5.2:1 | ✅ AA (texte) |
| Zinc-500 sur noir | 3.8:1 | ⚠️ AA (grand texte seulement) |

**Règle** : Toujours utiliser `text-white` ou `text-red-600` sur fonds sombres.

### 🔍 Sémantique HTML

```jsx
// ✅ BON
<nav>
  <Link href="/">Accueil</Link>
</nav>

// ❌ MAUVAIS
<div onClick={navigate}>
  Accueil
</div>
```

### ⌨️ Navigation au clavier

- Tous les éléments cliquables doivent avoir `.focus:ring-2 .focus:ring-red-600`
- Order logique des tabulations
- Raccourcis clavier documentés

### 🏷️ Attributs ARIA

```jsx
<button aria-label="Menu principal" />
<div role="status" aria-live="polite">
  {message}
</div>
```

---

## Configuration Tailwind

### 📝 tailwind.config.ts (Optimisé)

```typescript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette personnalisée (optionnel, pour nommage custom)
        "pst-black": "#000000",
        "pst-white": "#FFFFFF",
        "pst-red": "#DC2626",
      },
      animation: {
        // Animations custom si nécessaire
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      borderRadius: {
        // Arrondis custom
        "card": "1.75rem",  // rounded-[28px]
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}
```

### 🎨 globals.css (Optimisé)

```css
@import "tailwindcss";

@source "../components/**/*.{ts,tsx}";
@source "../app/**/*.{ts,tsx}";

@theme {
  --color-background: #000000;
  --color-foreground: #ffffff;
}

:root {
  --background: #000000;
  --foreground: #ffffff;
}

body {
  @apply bg-black text-white font-sans;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Transitions fluides par défaut */
* {
  border-color: rgba(255, 255, 255, 0.1);
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Focus visible pour accessibilité */
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-red-600;
}
```

---

## Implémentation & Assets

### 📁 Structure de fichiers

```
pst-2026/
├── app/
│   ├── globals.css          ← Styles globaux & thème
│   ├── page.tsx             ← Page accueil
│   ├── layout.tsx           ← Layout principal
│   ├── (sections)/
│   │   ├── about/page.tsx
│   │   ├── classement/page.tsx
│   │   ├── tournois/page.tsx
│   │   └── videos/page.tsx
│   └── ...
├── components/
│   ├── Navbar.tsx           ← Navigation cohérente
│   ├── Footer.tsx           ← Pied de page
│   ├── Card.tsx             ← Cartes réutilisables
│   └── ...
├── public/
│   ├── logo.svg             ← Logo Paris Saint-Tropez
│   ├── icon.png             ← Favicon
│   └── ...
└── tailwind.config.ts       ← Configuration couleurs
```

### 🎯 Checklist d'implémentation

#### Phase 1 : Base
- [ ] Mise à jour `tailwind.config.ts` avec palette étendue
- [ ] Révision `globals.css` (animations, focus states)
- [ ] Mise à jour Navbar avec cohérence rouge-blanc
- [ ] Page accueil → vérifier tous les éléments (hero, cards, buttons)

#### Phase 2 : Composants
- [ ] Card réutilisable (`.tsx` file)
- [ ] Button composant (primaire, secondaire)
- [ ] Badge composant
- [ ] Navigation composant (desktop + mobile)

#### Phase 3 : Pages
- [ ] `/` (accueil)
- [ ] `/classement`
- [ ] `/tournois`
- [ ] `/videos`
- [ ] `/about`, `/concept`, `/regles-elo`

#### Phase 4 : Qualité
- [ ] Test accessibilité (WCAG 2.1 AA)
- [ ] Test responsive (mobile, tablet, desktop)
- [ ] Performance (Lighthouse 90+)
- [ ] Cross-browser (Chrome, Firefox, Safari, Edge)

---

### 📸 Exemples de composants

#### Bouton réutilisable

```jsx
// components/Button.tsx
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}) {
  const baseStyles = "font-black uppercase tracking-widest transition-all rounded-full";
  
  const variants = {
    primary: "bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white",
    secondary: "text-white hover:text-red-600",
    ghost: "text-gray-500 hover:text-white",
  };
  
  const sizes = {
    sm: "px-3 py-1 text-[10px]",
    md: "px-4 py-2 text-xs",
    lg: "px-6 py-3 text-sm",
  };
  
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]}`} {...props}>
      {children}
    </button>
  );
}
```

#### Card réutilisable

```jsx
// components/Card.tsx
export function Card({ 
  icon: Icon, 
  title, 
  description, 
  href,
  accentColor = 'red',
  children 
}) {
  const accentClasses = {
    red: "hover:bg-red-900 hover:border-red-600",
    purple: "hover:bg-purple-600/30 hover:border-purple-600/50",
    gray: "hover:bg-zinc-500/30 hover:border-zinc-500",
  };
  
  return (
    <Link href={href}>
      <div className={`group relative bg-zinc-800/50 border border-white/10 p-8 
                      rounded-3xl ${accentClasses[accentColor]} 
                      transition-all duration-500 cursor-pointer`}>
        <div className="bg-zinc-700 p-4 rounded-2xl mb-6 
                        group-hover:scale-[1.6] group-hover:bg-red-600 
                        transition-all duration-500">
          <Icon size={28} className="text-white" />
        </div>
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-400 text-xs font-black uppercase tracking-widest">
          {description}
        </p>
        {children}
      </div>
    </Link>
  );
}
```

---

## 🚀 Ressources & Documentation

### Outils recommandés
- **Figma** : Prototype & design system
- **Tailwind UI** : Composants inspirants
- **WebAIM** : Vérification contraste/accessibilité
- **Lighthouse** : Audit performance & a11y

### Lien documentation
- [Tailwind CSS](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/en-US/)

---

## 📞 Contact & Révisions

**Version** : 1.0  
**Date** : Mai 2026  
**Auteur** : Design System  
**Statut** : 🟢 Actif

Toute modification à cette charte doit être documentée et versionnée.

---

**Paris Saint-Tropez 2026 — Tournoi de Pétanque Officiel**
