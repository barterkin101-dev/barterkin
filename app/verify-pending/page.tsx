import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ResendLinkButton } from '@/components/auth/ResendLinkButton'

export const metadata = { title: 'Verify your email — Barterkin' }

/**
 * AUTH-04: Email-verify UX gate.
 * Rendered when middleware redirects an authed-but-unverified user here.
 * Copy locked in 02-UI-SPEC.md lines 148–161.
 */
export default async function VerifyPendingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = (data?.claims?.email as string | undefined) ?? 'your inbox'

  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      <Card className="max-w-[480px] w-full bg-sage-pale border-sage-light">
        <CardHeader className="space-y-6">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            One more step
          </h1>
          <h2 className="font-serif text-2xl font-bold leading-[1.2]">
            Verify your email to join the directory
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-[1.5]">
            We sent a verification link to {email}. Click it to confirm you own this address — this keeps Barterkin a real-community space and protects members from bots and duplicate accounts.
          </p>
          <p className="text-base leading-[1.5]">
            Until you verify, your profile won&apos;t appear in the directory and you can&apos;t contact other members.
          </p>

          <div className="pt-2">
            <ResendLinkButton email={email} />
          </div>

          <div className="text-sm pt-2">
            Signed in with the wrong address?{' '}
            <LogoutButton />{' '}
            <span className="text-muted-foreground">and try again.</span>
          </div>

          <p className="text-sm text-muted-foreground text-right pt-2">
            Still stuck?{' '}
            <a href="mailto:contact@barterkin.com" className="underline">
              Email contact@barterkin.com
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
