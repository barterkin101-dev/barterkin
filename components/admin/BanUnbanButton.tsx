'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { banMember, unbanMember } from '@/lib/actions/admin'

interface BanUnbanButtonProps {
  profileId: string
  displayName: string
  isBanned: boolean
}

export function BanUnbanButton({ profileId, displayName, isBanned }: BanUnbanButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const label = isBanned ? 'Unban this member' : 'Ban this member'
  const title = isBanned ? `Unban ${displayName}?` : `Ban ${displayName}?`
  const body = isBanned
    ? 'Their profile will appear in the directory again.'
    : "Their profile will be hidden from the directory. They won't get an email. You can unban them later."
  const confirmLabel = isBanned ? 'Unban member' : 'Ban member'
  const pendingLabel = isBanned ? 'Unbanning…' : 'Banning…'

  const handleConfirm = () => {
    startTransition(async () => {
      const action = isBanned ? unbanMember : banMember
      const result = await action(profileId)
      if (result.ok) {
        setOpen(false)
        if (isBanned) {
          toast.success(`${displayName} has been unbanned.`)
        } else {
          toast.success(`${displayName} has been banned.`)
        }
      } else {
        if (isBanned) {
          toast.error(`Couldn't unban ${displayName}. Try again.`)
        } else {
          toast.error(`Couldn't ban ${displayName}. Try again.`)
        }
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          variant={isBanned ? 'outline' : 'destructive'}
          className="h-11"
          data-testid="ban-unban-trigger"
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>No, go back</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              // Keep dialog open until Server Action resolves — prevents premature close
              e.preventDefault()
              handleConfirm()
            }}
            className={
              isBanned
                ? 'bg-clay hover:bg-clay/90 text-sage-bg'
                : undefined
            }
            data-testid="ban-unban-confirm"
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
