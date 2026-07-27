'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// Équivalent client de utils/favori.ts (getFavoriId) — pour les pages 'use client' (live/admin)
// qui ne peuvent pas faire l'appel côté serveur.
export function useFavoriId(): number | null {
  const [favoriId, setFavoriId] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('site_users').select('favoris').eq('id', user.id).single().then(({ data }) => {
        if (data?.favoris != null) setFavoriId(data.favoris);
      });
    });
  }, []);

  return favoriId;
}
