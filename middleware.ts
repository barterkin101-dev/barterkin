import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Phase 1: session refresh only. No route-gating (no auth UI yet).
  // Phase 2 (AUTH-04, AUTH-09) will add `(app)` and `(auth)` group redirects here.
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico / robots.txt / sitemap.xml
     * - api/webhooks (Resend + Supabase webhooks must skip auth)
     * - PWA manifest + icon asset file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}
