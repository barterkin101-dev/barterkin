'use client'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Ban, Flag } from 'lucide-react'
import { BlockDialog } from './BlockDialog'
import { ReportDialog } from './ReportDialog'

interface OverflowMenuProps {
  viewerOwnerId: string | null
  profileOwnerId: string
  profileId: string
  displayName: string
  username: string
}

export function OverflowMenu({
  viewerOwnerId,
  profileOwnerId,
  profileId,
  displayName,
  username,
}: OverflowMenuProps) {
  const [blockOpen, setBlockOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  // D-05: don't render for unauthenticated viewers or own profile
  if (!viewerOwnerId || viewerOwnerId === profileOwnerId) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`More actions for ${displayName}`}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setBlockOpen(true)
            }}
          >
            <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
            Block {displayName}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault()
              setReportOpen(true)
            }}
          >
            <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
            Report {displayName}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        blockedOwnerId={profileOwnerId}
        blockedDisplayName={displayName}
        blockedUsername={username}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetProfileId={profileId}
        targetDisplayName={displayName}
      />
    </>
  )
}
