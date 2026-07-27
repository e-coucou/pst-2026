'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// Équivalent client du RPC 'is_super' utilisé côté serveur dans app/live/(super)/layout.tsx —
// pour afficher conditionnellement des outils réservés aux super admins sur des pages du
// groupe (admin), accessible aussi aux simples admins.
export function useIsSuper(): boolean {
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc('is_super').then(({ data }: { data: boolean | null }) => {
      if (data === true) setIsSuper(true);
    });
  }, []);

  return isSuper;
}
