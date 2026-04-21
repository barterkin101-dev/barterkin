'use client'

import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DirectoryErrorState() {
  return (
    <div className="py-16 text-center">
      <Card className="max-w-xl mx-auto bg-sage-pale border-sage-light p-8 md:p-12 space-y-6">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-forest-deep">
          Something went wrong loading the directory.
        </h2>
        <p className="text-base text-forest-deep leading-[1.5] max-w-md mx-auto">
          Please refresh the page. If the problem keeps happening, try again in a few minutes.
        </p>
        <Button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.reload()
          }}
          variant="outline"
          size="lg"
          className="h-11 min-w-[180px]"
        >
          Reload page
        </Button>
      </Card>
    </div>
  )
}
