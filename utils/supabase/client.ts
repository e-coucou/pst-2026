import { createBrowserClient } from '@supabase/ssr'
import { increment, decrement } from '@/utils/loading-bus'

export function createClient() {
  return createBrowserClient(
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
}
