# 📍 PLACEMENT DES FICHIERS

## Vue d'ensemble

Voici où placer chaque fichier dans ton projet `pst-2026/`.

---

## 📋 Liste des fichiers

### 1. Page Charte

**Fichier source fourni :** `charte-page.tsx`

**Destination dans le projet :**
```
app/charte/page.tsx
```

**Instructions :**
1. Crée le dossier `app/charte/` s'il n'existe pas
2. Copie `charte-page.tsx` en tant que `page.tsx`

---

### 2. Route API Charte

**Fichier source fourni :** `api-charte-route.ts`

**Destination dans le projet :**
```
app/api/charte/route.ts
```

**Instructions :**
1. Crée le dossier `app/api/charte/` s'il n'existe pas
2. Copie `api-charte-route.ts` en tant que `route.ts`

---

### 3. Composant Markdown Display

**Fichier source fourni :** `MarkdownDisplay.tsx`

**Destination dans le projet :**
```
components/MarkdownDisplay.tsx
```

**Instructions :**
1. Copie `MarkdownDisplay.tsx` directement dans le dossier `components/`

---

### 4. Configuration Tailwind

**Fichier source fourni :** `tailwind.config.ts`

**Destination dans le projet :**
```
tailwind.config.ts  (à la racine, remplace le fichier existant)
```

**Instructions :**
1. **Sauvegarde une copie** de ton `tailwind.config.ts` actuel
2. Remplace par le nouveau `tailwind.config.ts` fourni
3. **Alternative** : Merge manuellement (voir section "Merge manuel" ci-dessous)

---

### 5. Fichier Markdown de la Charte

**Fichier source fourni :** `CHARTE-GRAPHIQUE-PST.md`

**Destination dans le projet :**
```
CHARTE-GRAPHIQUE-PST.md  (à la racine du projet)
```

**Instructions :**
1. Copie `CHARTE-GRAPHIQUE-PST.md` à la racine du projet
2. Vérifie qu'il n'y a pas de conflit avec un fichier existant

---

## 📂 Arborescence finale attendue

```
pst-2026/
│
├── 📄 CHARTE-GRAPHIQUE-PST.md          ← Fourni (à copier)
│
├── app/
│   ├── api/
│   │   └── charte/
│   │       └── 📄 route.ts             ← Fourni (api-charte-route.ts)
│   │
│   ├── charte/
│   │   └── 📄 page.tsx                 ← Fourni (charte-page.tsx)
│   │
│   ├── layout.tsx                      (existant, ne pas toucher)
│   ├── globals.css                     (existant, peut être amélioré)
│   ├── page.tsx                        (existant, ne pas toucher)
│   └── ... (autres pages)
│
├── components/
│   ├── 📄 MarkdownDisplay.tsx          ← Fourni
│   ├── Navbar.tsx                      (existant, ne pas toucher)
│   ├── Footer.tsx                      (existant, ne pas toucher)
│   └── ... (autres composants)
│
├── 📄 tailwind.config.ts               ← REMPLACER par version fournie
│
├── package.json                        (existant, à mettre à jour)
├── postcss.config.mjs                  (existant, ne pas toucher)
├── tsconfig.json                       (existant, ne pas toucher)
│
└── ... (autres fichiers)
```

---

## 🔧 Étapes d'intégration détaillées

### Étape 1 : Créer les dossiers

```bash
# À la racine du projet
mkdir -p app/charte
mkdir -p app/api/charte
```

### Étape 2 : Copier les fichiers

#### Option A : Copie manuelle (GUI)

1. Ouvre l'explorateur de fichiers
2. Navigue vers le dossier où les fichiers sont téléchargés
3. Copie/colle chaque fichier à sa destination (voir tableau ci-dessus)

#### Option B : Copie via terminal

```bash
# À partir du répertoire où tu as téléchargé les fichiers

# Copier la page charte
cp charte-page.tsx /chemin/vers/pst-2026/app/charte/page.tsx

# Copier la route API
cp api-charte-route.ts /chemin/vers/pst-2026/app/api/charte/route.ts

# Copier le composant
cp MarkdownDisplay.tsx /chemin/vers/pst-2026/components/MarkdownDisplay.tsx

# Copier la config Tailwind
cp tailwind.config.ts /chemin/vers/pst-2026/tailwind.config.ts

# Copier le markdown
cp CHARTE-GRAPHIQUE-PST.md /chemin/vers/pst-2026/CHARTE-GRAPHIQUE-PST.md
```

### Étape 3 : Installer les dépendances

```bash
cd /chemin/vers/pst-2026

npm install react-markdown
npm install -D @tailwindcss/typography
```

### Étape 4 : Mettre à jour package.json (vérification)

Ouvre `package.json` et vérifie que tu vois :

```json
{
  "dependencies": {
    "react-markdown": "^x.x.x",  // ← Doit exister
    // ... autres dépendances
  },
  "devDependencies": {
    "@tailwindcss/typography": "^x.x.x",  // ← Doit exister
    // ... autres dépendances
  }
}
```

---

## 🔀 Merge manuel de tailwind.config.ts

Si tu préfères ne pas remplacer le fichier :

### Avant (existant)
```typescript
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},  // ← VIDE
  },
  future: {
    hoverOnlyWhenSupported: true,
  },  
  plugins: [],  // ← VIDE
}
```

### Après (à fusionner)

```typescript
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // ... 30+ règles CSS personnalisées ...
          },
        },
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },  
  plugins: [
    require('@tailwindcss/typography'),  // ← AJOUTER
  ],
}
```

**Résumé :**
1. Ajoute `require('@tailwindcss/typography')` dans `plugins: []`
2. Ajoute `typography: { DEFAULT: { css: { ... } } }` dans `theme.extend`

---

## ✅ Checklist de vérification

### Après avoir copié les fichiers

- [ ] Dossier `app/charte/` existe
- [ ] Fichier `app/charte/page.tsx` existe
- [ ] Dossier `app/api/charte/` existe
- [ ] Fichier `app/api/charte/route.ts` existe
- [ ] Fichier `components/MarkdownDisplay.tsx` existe
- [ ] Fichier `CHARTE-GRAPHIQUE-PST.md` existe à la racine
- [ ] Fichier `tailwind.config.ts` est mis à jour
- [ ] Fichier `package.json` a `react-markdown` et `@tailwindcss/typography`

### Après avoir installé les dépendances

- [ ] `npm install` a terminé sans erreurs
- [ ] `node_modules/react-markdown/` existe
- [ ] `node_modules/@tailwindcss/typography/` existe

### Après avoir lancé le serveur

- [ ] `npm run dev` démarre sans erreurs
- [ ] Le serveur tourne sur `http://localhost:3000`
- [ ] Visite `http://localhost:3000/charte` → Page s'affiche

---

## 🧪 Test de santé

### 1. Vérifier que la page charge

```bash
curl http://localhost:3000/charte
```

Doit retourner du HTML avec la page charte.

### 2. Vérifier que l'API fonctionne

```bash
curl http://localhost:3000/api/charte
```

Doit retourner :
```json
{
  "content": "# 🏐 CHARTE GRAPHIQUE..."
}
```

### 3. Vérifier visuellement

Ouvre [http://localhost:3000/charte](http://localhost:3000/charte) dans le navigateur.

Dois voir :
- ✅ Header avec "Charte Graphique"
- ✅ Navigation rapide
- ✅ Contenu markdown stylisé
- ✅ Footer avec CTAs

---

## 🐛 Troubleshooting

### "Cannot find module 'react-markdown'"

```bash
npm install react-markdown
npm run dev  # Restart
```

### "Cannot find module '@tailwindcss/typography'"

```bash
npm install -D @tailwindcss/typography
npm run dev  # Restart
```

### "ENOENT: no such file or directory, open '.../CHARTE-GRAPHIQUE-PST.md'"

Le fichier markdown n'est pas trouvé.

**Vérifications :**
1. Confirme que `CHARTE-GRAPHIQUE-PST.md` existe à la racine du projet
2. Vérifie l'orthographe exacte du nom (sensible à la casse sur Linux/Mac)
3. Vérifie le chemin dans `app/api/charte/route.ts` : `join(process.cwd(), 'CHARTE-GRAPHIQUE-PST.md')`

### "Tailwind CSS n'applique pas les styles"

1. Vérifie que `plugins: [require('@tailwindcss/typography')]` est dans `tailwind.config.ts`
2. Rebuild Tailwind : `npm run dev`
3. Clear cache : `rm -rf .next/` puis `npm run dev`

---

## 📝 Notes importantes

### 1. Respects les chemins exacts

- `app/charte/page.tsx` (pas `app/charte/charte.tsx` ou autre)
- `app/api/charte/route.ts` (pas `app/api/charte.ts` ou autre)
- `CHARTE-GRAPHIQUE-PST.md` à la racine (pas dans `public/` ou ailleurs)

### 2. Cas sensible

Les noms de fichiers sont sensibles à la casse sur **Linux/Mac** :
- `MarkdownDisplay.tsx` ✅ (pas `markdowndisplay.tsx`)
- `CHARTE-GRAPHIQUE-PST.md` ✅ (pas `charte-graphique-pst.md`)

### 3. Redémarrage du serveur

Après avoir copié les fichiers :
```bash
# Ctrl+C pour arrêter le serveur
npm run dev  # Redémarre
```

### 4. Mise en cache

Si tu vois une vieille version :
- Clear cache navigateur : Ctrl+Shift+Delete
- Clear Next.js cache : `rm -rf .next/`

---

## 🎯 Résumé rapide

| Fichier | Source | Destination | Action |
|---------|--------|-------------|--------|
| `charte-page.tsx` | Fourni | `app/charte/page.tsx` | Copier & renommer |
| `api-charte-route.ts` | Fourni | `app/api/charte/route.ts` | Copier & renommer |
| `MarkdownDisplay.tsx` | Fourni | `components/MarkdownDisplay.tsx` | Copier |
| `tailwind.config.ts` | Fourni | `tailwind.config.ts` | Remplacer |
| `CHARTE-GRAPHIQUE-PST.md` | Fourni | `CHARTE-GRAPHIQUE-PST.md` | Copier à la racine |

**Puis :**
```bash
npm install react-markdown
npm install -D @tailwindcss/typography
npm run dev
```

**Puis visite :** http://localhost:3000/charte 🚀

---

**Questions ? Regarde le fichier `GUIDE-INTEGRATION-CHARTE.md` pour plus de détails.**
