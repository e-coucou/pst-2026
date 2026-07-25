import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { increment, decrement } from '@/utils/loading-bus'

// Singleton : chaque composant appelle createClient(), mais une seule instance
// de GoTrueClient doit exister par onglet. Sinon plusieurs instances se battent
// pour le même verrou de rafraîchissement de token (localStorage), ce qui finit
// par expirer le verrou et déclencher des déconnexions forcées.
let client: SupabaseClient | undefined

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Instrumente toutes les requêtes (from/rpc/...) pour piloter un loader global
        fetch: async (input, init) => {
          increment();
          try {
            return await fetch(input, init);
          } finally {
            decrement();
          }
        },
      },
    }
  )

  return client
}
