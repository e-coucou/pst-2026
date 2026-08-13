'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// Lien "Retour" générique pour une page accessible depuis plusieurs points d'entrée (ex:
// /tournois/recherche, atteignable depuis /tournois et /stats) : un href fixe mentirait sur la
// moitié des visites. Utilise l'historique du navigateur, avec repli sur `fallbackHref` si la
// page est ouverte directement (nouvel onglet, lien partagé — pas d'entrée précédente à dépiler).
export default function BackButton({ fallbackHref, label = 'Retour' }: { fallbackHref: string; label?: string }) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-zinc-400 hover:text-red-600 transition-colors text-xs font-black uppercase tracking-widest"
    >
      <ChevronLeft size={16} /> {label}
    </button>
  );
}
