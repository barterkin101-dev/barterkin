'use client'

import { useEffect, useState } from 'react'
import { Flame, Trophy, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'

const MILESTONES = [3, 7, 14, 30]

function getNextMilestone(streak: number): number | null {
  return MILESTONES.find((m) => m > streak) ?? null
}

function getCurrentMilestone(streak: number): number | null {
  const passed = MILESTONES.filter((m) => m <= streak)
  return passed.length > 0 ? passed[passed.length - 1] : null
}

function getMilestoneMessage(streak: number, nextMilestone: number | null): string {
  if (streak === 0) {
    return 'Log in today to start your streak and earn daily credits.'
  }
  const current = getCurrentMilestone(streak)
  if (current && streak === current) {
    return `Amazing! You have hit a ${current}-day streak. Keep it going!`
  }
  if (nextMilestone) {
    const daysUntil = nextMilestone - streak
    return `${daysUntil} day${daysUntil === 1 ? '' : 's'} until your ${nextMilestone}-day streak milestone.`
  }
  return `You are on a ${streak}-day streak. Incredible consistency!`
}

interface StreakMilestoneBannerProps {
  streak: number
}

export function StreakMilestoneBanner({ streak }: StreakMilestoneBannerProps) {
  const [hasAnimated, setHasAnimated] = useState(false)
  const nextMilestone = getNextMilestone(streak)
  const currentMilestone = getCurrentMilestone(streak)
  const progress = nextMilestone
    ? Math.round((streak / nextMilestone) * 100)
    : 100

  useEffect(() => {
    if (!hasAnimated && currentMilestone && streak === currentMilestone) {
      setHasAnimated(true)
      captureClientEvent('streak_milestone_reached', {
        streak,
        milestone: currentMilestone,
      })
    }
  }, [hasAnimated, streak, currentMilestone])

  const isMilestoneDay = currentMilestone !== null && streak === currentMilestone
  const isZero = streak === 0

  return (
    <Card className={`
      ${isMilestoneDay ? 'border-orange-300 bg-orange-50/80' : isZero ? 'border-slate-200 bg-slate-50/60' : 'border-border bg-card'}
    `}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-full
            ${isMilestoneDay ? 'bg-orange-100' : isZero ? 'bg-slate-100' : 'bg-orange-50'}
          `}>
            {isMilestoneDay ? (
              <Trophy className="h-5 w-5 text-orange-600" />
            ) : (
              <Flame className={`h-5 w-5 ${isZero ? 'text-slate-400' : 'text-orange-500'}`} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isZero
                ? 'Start your streak today'
                : isMilestoneDay
                  ? `${streak}-day streak milestone reached!`
                  : `${streak}-day streak`}
            </p>
            <p className="text-xs text-muted-foreground">
              {getMilestoneMessage(streak, nextMilestone)}
            </p>
          </div>
          {isMilestoneDay && (
            <ArrowRight className="h-4 w-4 text-orange-500 animate-pulse" />
          )}
        </div>

        {nextMilestone && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to {nextMilestone}-day milestone</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isMilestoneDay ? 'bg-orange-500' : 'bg-orange-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
