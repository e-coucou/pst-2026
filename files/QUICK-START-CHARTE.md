# ⚡ Quick Start — Page Charte Graphique

## 📋 Fichiers créés

```
pst-2026/
├── 📄 CHARTE-GRAPHIQUE-PST.md          [Racine] Contenu markdown
├── app/
│   ├── api/
│   │   └── charte/
│   │       └── route.ts                [API] Servir le markdown
│   └── charte/
│       └── page.tsx                    [Page] Affichage de la charte
├── components/
│   └── MarkdownDisplay.tsx             [Composant] Rendu personnalisé
└── tailwind.config.ts                  [Config] ✅ Mis à jour (+typography)
```

---

## 🚀 Installation en 3 étapes

### ✅ Étape 1 : Installer les dépendances

```bash
npm install react-markdown
npm install -D @tailwindcss/typography
```

### ✅ Étape 2 : Copier les fichiers

Tous les fichiers sont déjà créés dans ton repo. Assure-toi que :
- ✅ `CHARTE-GRAPHIQUE-PST.md` existe à la racine
- ✅ `/app/api/charte/route.ts` existe
- ✅ `/app/charte/page.tsx` existe
- ✅ `/components/MarkdownDisplay.tsx` existe
- ✅ `tailwind.config.ts` est mis à jour

### ✅ Étape 3 : Lancer le serveur

```bash
npm run dev
```

Puis visite : **http://localhost:3000/charte** 🎉

---

## 🎨 Résultat attendu

```
┌─────────────────────────────────────────────────────┐
│ [← Retour] [Charte Graphique] [Spacer]              │ ← Header sticky
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Navigation rapide - sticky]                        │
│ → Vue d'ensemble                                    │
│ → Palette de couleurs                              │
│ → Typographie                                      │
│ → ... (8 sections)                                 │
│                                                     │
│ # 🏐 CHARTE GRAPHIQUE — Paris Saint-Tropez 2026   │ ← Contenu markdown
│                                                     │
│ ## Vue d'ensemble                                  │
│                                                     │
│ L'application PST-2026 adopte une esthétique...   │
│                                                     │
│ [Tableaux, listes, code blocks stylisés...]        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│ ← CTA Footer
│ │ Besoin de précisions ?                          ││
│ │ [En savoir plus] [← Retour accueil]             ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 Structure de la requête API

### Client (page.tsx) → Serveur (route.ts)

```
GET /api/charte
    ↓
route.ts lit CHARTE-GRAPHIQUE-PST.md du filesystem
    ↓
Retourne :
{
  "content": "# 🏐 CHARTE GRAPHIQUE...\n\n## Vue d'ensemble\n..."
}
    ↓
react-markdown affiche le contenu
    ↓
MarkdownDisplay applique le styling
```

---

## ✨ Features

| Feature | Détail |
|---------|--------|
| **API cachée** | 1h en prod, ~0ms en dev |
| **Error handling** | Affiche messages clairs + bouton retry |
| **Loading state** | Spinner avec animation |
| **Navigation rapide** | Table des matières sticky |
| **Responsive** | Adapté mobile/tablet/desktop |
| **Styling** | Conforme à la charte (noir/blanc/rouge) |
| **Performance** | Client-side rendering, cache API |

---

## 🎯 Points clés

### 1️⃣ Fichier markdown stocké à la racine

```typescript
// Dans route.ts
const filePath = join(process.cwd(), 'CHARTE-GRAPHIQUE-PST.md');
```

✅ Permet de mettre à jour le contenu sans redéployer

### 2️⃣ Composant `MarkdownDisplay` réutilisable

```jsx
// Utilisation
<MarkdownDisplay content={markdownString} />

// Personnalisation
components={{ h1: custom, code: custom, ... }}
```

✅ Adapté à d'autres pages (docs, tutoriels, etc.)

### 3️⃣ Prose Tailwind personnalisée

```typescript
// tailwind.config.ts
typography: {
  DEFAULT: {
    css: {
      color: '#e5e7eb',
      a: { color: '#dc2626' },
      h1: { color: '#ffffff', ... },
      // ... 30+ règles CSS
    }
  }
}
```

✅ Cohérent avec la charte graphique

### 4️⃣ Page `'use client'` pour UX fluide

```jsx
'use client'; // → Client-side fetching
              // → Loading states
              // → Error handling
```

✅ Meilleure expérience utilisateur

---

## 🧪 Test rapide

### 1. Vérifier l'API

```bash
curl http://localhost:3000/api/charte
```

Doit retourner du JSON avec la clé `content`.

### 2. Vérifier la page

Ouvre : http://localhost:3000/charte

Dois voir :
- Header avec titre
- Navigation rapide
- Contenu markdown rendu
- Footer avec CTAs

### 3. Vérifier le styling

Le contenu doit être :
- ✅ Texte blanc sur fond noir
- ✅ Titres en rouge (h3)
- ✅ Code en rouge sur zinc-900
- ✅ Tables avec hover effect
- ✅ Links soulignés en rouge

---

## 🔄 Mise à jour de la charte

Pour **modifier le contenu** :

1. Édite `CHARTE-GRAPHIQUE-PST.md` à la racine
2. **Sauvegarde** (Ctrl+S ou Cmd+S)
3. **Actualise** le navigateur (F5 ou Cmd+R)

✅ Aucun redéploiement requis !

---

## 🎓 Cas d'usage avancés

### Ajouter une recherche intra-page

```jsx
// Dans page.tsx
const [search, setSearch] = useState('');
const filtered = content?.includes(search);
```

### Télécharger le markdown en PDF

```jsx
import { jsPDF } from 'jspdf';
const downloadPDF = () => {
  const pdf = new jsPDF();
  pdf.text(content, 10, 10);
  pdf.save('charte.pdf');
};
```

### Synchroniser avec GitHub

```javascript
// Lire depuis GitHub raw
const res = await fetch(
  'https://raw.githubusercontent.com/[user]/[repo]/main/CHARTE-GRAPHIQUE-PST.md'
);
```

---

## 🛠️ Troubleshooting rapide

| Problème | Solution |
|----------|----------|
| Page vide | Vérifier que `CHARTE-GRAPHIQUE-PST.md` existe |
| Erreur 500 | Vérifier la console / les logs serveur |
| Styling qui ne marche pas | `npm install -D @tailwindcss/typography` + rebuild |
| Links rouges au lieu de bleus | C'est normal, on force `text-red-600` 😊 |

---

## 📞 Prochaines étapes

1. **Ajouter un lien dans la Navbar** → `/charte`
2. **Personnaliser la navigation rapide** → Selon ton markdown
3. **Ajouter des sections** → Modifie le markdown
4. **Intégrer un feedback form** → Envoyer suggestions

---

**Prêt ? → Visite http://localhost:3000/charte 🚀**
