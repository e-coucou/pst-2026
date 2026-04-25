import { createServerClient, type NextRequest } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // LISTE DES PAGES PUBLIQUES (Ouvertes à tous)
  const publicRoutes = ['/', '/concept', '/regles-elo', '/about', '/login', '/signup']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // SI LA PAGE EST PRIVÉE ET QUE L'UTILISATEUR N'EST PAS CONNECTÉ
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - api (routes d'API)
     * - _next/static (fichiers statiques)
     * - _next/image (images optimisées)
     * - favicon.ico (icône du site)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
