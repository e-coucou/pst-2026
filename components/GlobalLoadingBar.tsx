'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '@/utils/loading-bus';

export default function GlobalLoadingBar() {
  const count = useSyncExternalStore(subscribe, getSnapshot, () => 0);

  if (count === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-[3px] z-[200] overflow-hidden pointer-events-none">
      <div className="h-full w-1/3 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-[loading-bar_1s_ease-in-out_infinite]" />
    </div>
  );
}
