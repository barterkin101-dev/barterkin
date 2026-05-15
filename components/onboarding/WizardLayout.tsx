import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProgressIndicator } from './ProgressIndicator'

export function WizardLayout({
  currentStep,
  children,
}: {
  currentStep: number
  children: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-xl bg-sage-pale border-sage-light">
      <CardHeader className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-mid">
          Welcome to Barterkin
        </p>
        <ProgressIndicator currentStep={currentStep} totalSteps={3} />
      </CardHeader>
      <CardContent className="space-y-6 p-6 md:p-8">
        {children}
      </CardContent>
      <Separator className="bg-sage-light" />
      <CardFooter className="justify-center py-4">
        <form action="/onboarding/skip" method="post">
          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: 'link' }),
              'h-auto px-0 py-0 text-sm text-forest-mid',
            )}
          >
            Skip for now
          </button>
        </form>
      </CardFooter>
    </Card>
  )
}
