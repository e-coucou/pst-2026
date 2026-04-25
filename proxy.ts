// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server' // ✅ NextRequest vient d'ici !

export async function proxy(request: NextRequest) { // ✅ On renomme la fonction en 'proxy'
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Utilisation des méthodes recommandées pour Next.js 15/16
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicRoutes = ['/', '/concept', '/regles-elo', '/about', '/login', '/signup']
  
  // Petite astuce : on ajoute une vérification pour les fichiers statiques ici aussi
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf celles exclues ci-dessous
     * Ajout des extensions d'images pour éviter que le proxy n'intercepte les fichiers du storage
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
