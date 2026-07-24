'use client'; // Indispensable pour le onClick

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; // On utilise le client ici
import { useRouter } from 'next/navigation';
import { logActivity } from '@/utils/log-activity';

interface Props {
  playerId: number;
  initialIsFavori: boolean;
  userId: string;
}

export default function FavoriteButton({ playerId, initialIsFavori, userId }: Props) {
  const [isFavori, setIsFavori] = useState(initialIsFavori);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

const toggleFavori = async () => {
  setLoading(true);
  const newValue = isFavori ? null : playerId;
//  console.log("Tentative d'update...", { userId, newValue }); // DEBUG

  const { data, error } = await supabase
    .from('site_users')
    .update({ favoris: newValue }) // Vérifie bien le nom ici
    .eq('id', userId)
    .select(); // On demande le retour pour confirmer

  if (error) {
    console.error("Erreur Supabase détaillée :", error.message, error.details);
    alert("Erreur : " + error.message); // Pour le voir sur mobile/tablette
  } else {
    console.log("Update réussi ! Nouveau favori :", newValue);
      setIsFavori(!isFavori);
      logActivity(supabase, newValue ? 'FAVORITE_SET' : 'FAVORITE_UNSET', { player_id: playerId });
      router.refresh();
  }
  setLoading(false);
};    
    
    
  return (
    <button 
      onClick={toggleFavori} 
      disabled={loading}
      className="hover:scale-110 transition-transform active:opacity-70 p-2"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      ) : (
        <Star 
          size={20} 
          className={isFavori ? "text-red-600 fill-red-600" : "text-zinc-600 fill-zinc-600"} 
        />
      )}
    </button>
  );
}