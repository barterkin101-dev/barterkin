import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-xl w-full bg-sage-pale border-forest-mid/20">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-forest-deep">
            Barterkin foundation
          </CardTitle>
          <CardDescription className="text-forest-mid">
            Phase 1 scaffold: palette + fonts + shadcn installed. Auth, directory, and contact relay ship in Phases 2–5.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button className="bg-forest hover:bg-forest-deep text-sage-bg">Sage / forest primary</Button>
          <Button variant="outline" className="border-clay text-clay hover:bg-clay/10">Clay accent</Button>
        </CardContent>
      </Card>
    </main>
  )
}
