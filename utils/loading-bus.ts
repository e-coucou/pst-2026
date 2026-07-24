// Petit bus global (sans dépendance) pour signaler qu'une requête Supabase est en cours.
// Permet d'afficher un indicateur de chargement immédiat sans instrumenter chaque appel.

type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function increment() {
  count++;
  notify();
}

export function decrement() {
  count = Math.max(0, count - 1);
  notify();
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return count;
}
