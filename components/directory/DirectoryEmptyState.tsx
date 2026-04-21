import Link from 'next/link'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DirectoryEmptyState() {
  return (
    <div className="py-16 text-center">
      <Card className="max-w-xl mx-auto bg-sage-pale border-sage-light p-8 md:p-12 space-y-6">
        <Users className="h-12 w-12 text-forest-mid mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-forest-deep">
          {"Nobody's here yet."}
        </h2>
        <p className="text-base text-forest-deep leading-[1.5] max-w-md mx-auto">
          {"The directory's still seeding. Be one of the first Georgians to list a skill and help the community find you."}
        </p>
        <Button
          asChild
          size="lg"
          className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
        >
          <Link href="/profile/edit">Build your profile</Link>
        </Button>
      </Card>
    </div>
  )
}
