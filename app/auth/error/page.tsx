import Link from 'next/link'

interface ErrorPageProps {
  searchParams: Promise<{ reason?: string }>
}

/**
 * Fallback error page for /auth/callback and /auth/confirm failures.
 * Surfaces a friendly retry option without exposing internal error messages.
 */
export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { reason } = await searchParams

  const COPY: Record<string, { heading: string; body: string }> = {
    exchange_failed: {
      heading: 'Sign-in failed',
      body: "We couldn't complete sign-in with Google. Try again, or use a magic link.",
    },
    missing_token: {
      heading: 'That link is missing something',
      body: 'Request a new magic link below.',
    },
    default: {
      heading: 'Something went wrong',
      body: 'Please try signing in again.',
    },
  }
  const copy = COPY[reason ?? 'default'] ?? COPY.default

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-[400px] w-full text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold leading-[1.2]">{copy.heading}</h1>
        <p className="text-base leading-[1.5] text-muted-foreground">{copy.body}</p>
        <Link
          href="/login"
          className="inline-block underline decoration-[var(--color-clay)] text-base"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
