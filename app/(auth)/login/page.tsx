import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <Card className="max-w-[400px] w-full bg-sage-pale border-sage-light">
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-bold leading-[1.2]">
          Welcome to Barterkin
        </CardTitle>
        <CardDescription className="text-base leading-[1.5] text-muted-foreground">
          Sign in to find and offer skills in your Georgia community.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <GoogleAuthBlock />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm />

        <p className="text-sm text-muted-foreground text-center">
          By continuing, you agree to our{' '}
          <Link href="/legal/tos" className="underline">Terms of Service</Link>,{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and{' '}
          <Link href="/legal/guidelines" className="underline">Community Guidelines</Link>.
        </p>

        <p className="text-sm text-center">
          New here?{' '}
          <Link href="/signup" className="underline">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  )
}
