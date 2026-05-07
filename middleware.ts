// middleware.ts
import { proxy } from '@/proxy' // Vérifie bien le chemin vers ton fichier proxy.ts
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // On appelle simplement ta fonction proxy que tu as déjà écrite
  return await proxy(request)
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - api (routes d'API)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - fichiers d'images (svg, png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}