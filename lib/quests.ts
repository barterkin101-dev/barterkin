export type QuestKey =
  | 'quest_daily_login'
  | 'quest_first_listing'
  | 'quest_complete_profile'
  | 'quest_referral_converted'
  | 'quest_first_message'

export interface QuestDef {
  key: QuestKey
  label: string
  description: string
  credits: number
  autoAwarded?: boolean
}

export interface QuestStatus {
  key: QuestKey
  completed: boolean
  credits: number
}

export const QUESTS: QuestDef[] = [
  {
    key: 'quest_daily_login',
    label: 'Daily Login',
    description: 'Log in today to keep your streak alive',
    credits: 1,
    autoAwarded: true,
  },
  {
    key: 'quest_first_listing',
    label: 'First Listing',
    description: 'Post your first item or service to trade',
    credits: 5,
    autoAwarded: true,
  },
  {
    key: 'quest_complete_profile',
    label: 'Complete Profile',
    description: 'Fill out your profile and publish it',
    credits: 3,
    autoAwarded: true,
  },
  {
    key: 'quest_referral_converted',
    label: 'Referral Converted',
    description: 'Invite a member who goes on to publish their profile',
    credits: 10,
    autoAwarded: true,
  },
  {
    key: 'quest_first_message',
    label: 'First Message',
    description: 'Send a message to another member',
    credits: 2,
    autoAwarded: true,
  },
]

export function isUtcDateToday(value: string | null | undefined): boolean {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
}
