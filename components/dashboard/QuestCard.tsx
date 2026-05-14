'use client'

import { CheckCircle2, Circle, Flame, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QUESTS, type QuestKey, type QuestStatus } from '@/lib/quests'

interface QuestCardProps {
  quests: QuestStatus[]
  streak: number
  credits: number
}

export function QuestCard({ quests, streak, credits }: QuestCardProps) {
  const totalEarnable = quests.reduce((sum, q) => sum + q.credits, 0)
  const totalEarned = quests.reduce((sum, q) => sum + (q.completed ? q.credits : 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Quests
          </span>
          <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            {streak}-day streak
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{credits} credits</span>
          <span>
            {totalEarned} / {totalEarnable} earned
          </span>
        </div>
        <div className="space-y-2">
          {quests.map((q) => {
            const quest = QUESTS.find((item) => item.key === q.key)

            return (
            <div
              key={q.key}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                q.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center gap-2">
                {q.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {quest?.label ?? QUEST_LABELS[q.key]}
                  </p>
                  <p className="text-xs text-muted-foreground">{quest?.description}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">+{q.credits} credits</span>
            </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

const QUEST_LABELS: Record<QuestKey, string> = {
  quest_daily_login: 'Daily Login',
  quest_first_listing: 'First Listing',
  quest_complete_profile: 'Complete Profile',
  quest_referral_converted: 'Referral Converted',
  quest_first_message: 'First Message',
}
