'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// Équivalent client du RPC 'get_residence_access_level' — palier d'accès résidence
// (0 aucun, 1 consultation, 2 avancé) indépendant du rôle global, sauf 'super' qui prime
// toujours (vérifié séparément via useIsSuper). Voir documents/architecture.md.
export function useResidenceAccessLevel(): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc('get_residence_access_level').then(({ data }: { data: number | null }) => {
      if (typeof data === 'number') setLevel(data);
    });
  }, []);

  return level;
}
