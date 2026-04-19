import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

/**
 * AUTH-05: Logout button.
 * Server component — renders a plain <form method="POST"> to /auth/signout.
 * No JS required; no CSRF token needed (same-origin cookie-bound POST,
 * idempotent intended action).
 * No confirmation dialog per UI-SPEC (reversible in 10 seconds).
 */
export function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST" className="inline-block">
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-1 text-sm"
        aria-label="Log out of Barterkin"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </Button>
    </form>
  )
}
