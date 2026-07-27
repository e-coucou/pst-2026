import { Star } from 'lucide-react';

// Petite étoile accolée au nom d'un joueur quand c'est le favori de l'utilisateur courant.
// Ne rend rien si `active` est faux — pas d'étoile grisée partout, juste un repère quand ça matche.
export default function FavoriStar({ active, size = 12, className = '' }: { active: boolean; size?: number; className?: string }) {
  if (!active) return null;
  return <Star size={size} className={`inline shrink-0 text-red-600 fill-red-600 ${className}`} />;
}
