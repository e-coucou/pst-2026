# 📖 Guide d'intégration — Page `/charte`

## 🎯 Vue d'ensemble

Cette page affiche la **Charte Graphique PST-2026** de manière interactive, avec :
- ✅ Rendu markdown via `react-markdown`
- ✅ Styling élégant avec `@tailwindcss/typography`
- ✅ Design conforme à la charte (noir/blanc/rouge)
- ✅ Navigation rapide (table des matières)
- ✅ Gestion des erreurs et chargement asynchrone
- ✅ Stockage du fichier markdown à la racine du projet

---

## 📦 Étapes d'installation

### 1. Installer les packages

```bash
npm install react-markdown
npm install -D @tailwindcss/typography
```

### 2. Mettre à jour `tailwind.config.ts`

✅ **Déjà fait** — Le fichier a été mis à jour avec:
- Configuration du plugin `@tailwindcss/typography`
- Thème prose personnalisé (couleurs, typographie, espacements)
- Styles pour code blocks, tables, blockquotes

### 3. Vérifier le fichier markdown

Assure-toi que `CHARTE-GRAPHIQUE-PST.md` existe à la **racine du projet** :

```
pst-2026/
├── CHARTE-GRAPHIQUE-PST.md  ← Ici !
├── app/
├── components/
└── ...
```

---

## 📁 Fichiers créés / modifiés

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `/app/api/charte/route.ts` | Route API qui retourne le contenu du markdown |
| `/app/charte/page.tsx` | Page d'affichage de la charte |
| `/components/MarkdownDisplay.tsx` | Composant réutilisable pour le rendu markdown |
| `CHARTE-GRAPHIQUE-PST.md` | Fichier markdown de la charte (à la racine) |

### Fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `tailwind.config.ts` | + Plugin typography, + config prose personnalisée |

---

## 🔧 Comment ça fonctionne ?

### Flow d'exécution

```
Utilisateur visite /charte
        ↓
Page charge (SSR-safe)
        ↓
useEffect → fetch('/api/charte')
        ↓
API route lit CHARTE-GRAPHIQUE-PST.md du système de fichiers
        ↓
Contenu retourné en JSON
        ↓
MarkdownDisplay affiche avec react-markdown + prose styling
        ↓
Utilisateur voit la charte formatée
```

### Composant `MarkdownDisplay`

Le composant personnalise le rendu de chaque élément markdown :

```jsx
<MarkdownDisplay 
  content={markdownString}
  className="custom-prose-class"
/>
```

**Personnalisations appliquées :**
- `h1`, `h2`, `h3` → Styles charte (typography, couleurs)
- `code` (inline) → Background zinc-900, couleur red-600
- `code` (block) → Avec indicateur de langue
- `table` → Styling élégant avec hover
- `blockquote` → Bordure rouge, italique
- `a` → Couleur red-600, underline
- `img` → Border subtle, responsive

---

## 🚀 Utilisation

### Accès à la page

```
http://localhost:3000/charte
```

### Navigation rapide

La page affiche une **table des matières sticky** avec liens vers chaque section du markdown.

### Gestion des erreurs

Si le fichier markdown n'est pas trouvé ou que la lecture échoue :
- ❌ Message d'erreur explicite
- 🔄 Bouton "Réessayer"
- 📋 Console logs détaillés

---

## ✨ Fonctionnalités

### Header sticky

```
[← Retour] [Charte Graphique] [Spacer]
```

- Lien retour à l'accueil
- Titre centré
- Cohérent avec la barre de navigation principale

### Navigation rapide

Table des matières sticky qui suit le scroll :
- `Vue d'ensemble`
- `Palette de couleurs`
- `Typographie`
- `Structure & Layouts`
- `Animations & Transitions`
- `Responsive Design`
- `Configuration Tailwind`
- `Accessibilité`

**À personnaliser selon le contenu du markdown.**

### États de chargement

| État | Affichage |
|------|-----------|
| **Loading** | Spinner + message "Chargement..." |
| **Error** | Card rouge avec message et bouton retry |
| **Success** | Contenu markdown rendu |

### Footer CTA

Appel à l'action avec boutons :
- "En savoir plus" → `/concept`
- "Retour accueil" → `/`

---

## 🎨 Styling appliqué

### Page générale
- **Fond** : `bg-black` (#000000)
- **Texte** : `text-white` (#ffffff)
- **Accents** : `text-red-600` (#DC2626)

### Prose (markdown)
- **Headings** : Blanc, font-black, italic, tracking serré
- **Body** : Gray-300, line-height genereux
- **Code inline** : Red-600 sur zinc-900, border subtle
- **Code block** : Avec language indicator
- **Tables** : Header zinc-800/50, hover effect
- **Links** : Red-600, underline red-600/30

### Navigation
- **Links** : Gray-500 → Red-600 au hover
- **Icons** : Smooth transitions

---

## 🔗 Routes créées

### GET `/api/charte`

**Requête :**
```bash
GET /api/charte
```

**Réponse (200 OK) :**
```json
{
  "content": "# 🏐 CHARTE GRAPHIQUE...\n\n## Vue d'ensemble\n..."
}
```

**Réponse (500 Error) :**
```json
{
  "error": "Impossible de charger la charte graphique",
  "message": "ENOENT: no such file or directory..."
}
```

**Headers de cache :**
```
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

---

## 📝 Personnalisations recommandées

### 1. Ajuster la navigation rapide

Modifie les liens dans `/app/charte/page.tsx` en fonction de tes sections markdown :

```jsx
<a href="#ma-section" className="...">
  → Ma Section
</a>
```

### 2. Modifier les couleurs prose

Édite le thème dans `tailwind.config.ts` section `typography`:

```typescript
h2: {
  color: '#dc2626', // Change la couleur des h2
}
```

### 3. Ajouter des animations

Utilise les animations Tailwind sur les éléments markdown :

```jsx
img: ({ src, alt }) => (
  <img 
    src={src} 
    alt={alt} 
    className="... animate-fadeIn" // Ajoute animation
  />
),
```

### 4. Intégrer dans la navigation principale

Ajoute un lien vers `/charte` dans la Navbar :

```jsx
<NavLink href="/charte" icon={<BookOpen size={16} />} label="Charte" />
```

---

## 🐛 Dépannage

### "ENOENT: no such file or directory"

❌ **Problème** : Le fichier `CHARTE-GRAPHIQUE-PST.md` n'est pas trouvé.

✅ **Solution** : 
1. Assure-toi que le fichier existe à la racine : `pst-2026/CHARTE-GRAPHIQUE-PST.md`
2. Vérifie le chemin dans `route.ts` : `join(process.cwd(), 'CHARTE-GRAPHIQUE-PST.md')`

### "Erreur lors du chargement"

❌ **Problème** : La requête API échoue.

✅ **Solutions** :
1. Vérifie que l'API route `/api/charte/route.ts` existe
2. Regarde la console (F12 → Network → /api/charte)
3. Vérifie les permissions de lecture du fichier

### Markdown mal formaté

❌ **Problème** : Certains éléments ne s'affichent pas bien.

✅ **Solutions** :
1. Vérifie la syntaxe markdown (headings, listes, code blocks)
2. Assure-toi que `react-markdown` est installé : `npm list react-markdown`
3. Vérifie que `@tailwindcss/typography` est dans les plugins Tailwind

### Style prose ne s'applique pas

❌ **Problème** : Le texte ne prend pas les couleurs/espacements définis.

✅ **Solutions** :
1. Vérifie que la classe `prose prose-invert` est appliquée : `<div className="prose prose-invert">`
2. Rebuild Tailwind : `npm run dev` (ou `npm run build`)
3. Clear cache : `rm -rf .next/`

---

## 📊 Performance

### Cache API

La réponse API est cachée **1 heure** (3600s) en production :

```typescript
'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
```

Cela signifie :
- Réponse fraîche pendant 1 heure
- Stale-while-revalidate pendant 24h supplémentaires
- Chargement optimisé après chaque déploiement

### Taille du fichier

Le markdown est stocké à la racine → pas de bundle overhead.

### Rendu client

La page est `'use client'` (client component) pour :
- Gestion flexible des états (loading, error)
- Fetch API natif
- Meilleure UX avec loading states

---

## 🔄 Mise à jour du markdown

Pour mettre à jour la charte :

1. **Modifie** `CHARTE-GRAPHIQUE-PST.md` à la racine
2. **Aucun redéploiement nécessaire** (fichier lu à runtime)
3. **Cache se vide après 1 heure** (ou manuellement en prod)

**Alternative rapide (dev) :**
- Hard refresh : `Ctrl+Shift+R` (ou `Cmd+Shift+R` sur Mac)
- Clear cache : ouvre DevTools → Application → Cache Storage → delete

---

## 🎓 Exemple d'extension

### Ajouter un formulaire de feedback

```jsx
{/* Dans /app/charte/page.tsx, après le contenu */}
<div className="mt-12 bg-zinc-900 border border-white/10 rounded-2xl p-8">
  <h3 className="text-xl font-black uppercase mb-4 text-white">
    Retour sur la charte ?
  </h3>
  <form className="space-y-4">
    <textarea 
      placeholder="Tes suggestions..."
      className="w-full bg-black border border-white/20 rounded p-3 text-white"
    />
    <button className="bg-red-600 text-white px-4 py-2 rounded font-black">
      Envoyer
    </button>
  </form>
</div>
```

### Ajouter un système de recherche

```jsx
const [search, setSearch] = useState('');
const filteredContent = content?.toLowerCase().includes(search.toLowerCase());
```

---

## 📚 Ressources

- [react-markdown Documentation](https://github.com/remarkjs/react-markdown)
- [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Tailwind Prose](https://tailwindcss.com/docs/typography-plugin)

---

**Version** : 1.0  
**Date** : Mai 2026  
**Statut** : 🟢 Prêt à l'emploi
