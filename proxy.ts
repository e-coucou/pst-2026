import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // 1. Créer la réponse initiale
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Initialiser Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // On recrée la réponse pour y injecter les cookies
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

  // 3. Récupérer l'utilisateur
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 4. LES ROUTES PUBLIQUES + LA ROUTE DE CALLBACK (Indispensable !)
  const publicRoutes = ['/', '/concept', '/regles-elo', '/about', '/login', '/signup', '/auth/callback']
  const isPublicRoute = publicRoutes.includes(pathname)

  // 5. LOGIQUE DE REDIRECTION
  // Si pas d'utilisateur et que la route n'est PAS publique -> Login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si l'utilisateur est connecté et essaie d'aller sur /login -> /stats
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/stats'
    return NextResponse.redirect(url)
  }

  return response
}