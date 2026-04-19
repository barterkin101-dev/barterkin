import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Session refresh + AUTH-04 (email-verify gate) + AUTH-09 (auth-group redirect).
  // All logic lives in updateSession; this file is just the entry point + matcher.
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
