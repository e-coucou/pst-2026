'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { logActivity } from '@/utils/log-activity';

function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    // Évite un double log (ex: strict mode / re-render sans navigation réelle)
    if (lastPath.current === path) return;
    lastPath.current = path;
    logActivity(supabase, 'PAGE_VIEW', { path });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}

// Nécessite un Suspense : useSearchParams() l'exige côté App Router.
export default function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
