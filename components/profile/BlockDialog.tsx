'use client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { blockMember } from '@/lib/actions/contact'

interface BlockDialogProps {
  open: boolean
  onOpenChange: (b: boolean) => void
  blockedOwnerId: string
  blockedDisplayName: string
  blockedUsername: string
}

export function BlockDialog({
  open,
  onOpenChange,
  blockedOwnerId,
  blockedDisplayName,
  blockedUsername,
}: BlockDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {/* form wraps Cancel + Confirm so submitting triggers the server action */}
        <form action={blockMember}>
          <input type="hidden" name="blockedOwnerId" value={blockedOwnerId} />
          <input type="hidden" name="blockedDisplayName" value={blockedDisplayName} />
          <input type="hidden" name="blockedUsername" value={blockedUsername} />
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-forest-deep">
              Block {blockedDisplayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              They won't appear in your directory and can't contact you. You can unblock later by contacting an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block {blockedDisplayName}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
