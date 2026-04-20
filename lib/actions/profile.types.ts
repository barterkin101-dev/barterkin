import type { Database } from '@/lib/database.types'

export interface SaveProfileResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
  slug?: string
}

export interface SetPublishedResult {
  ok: boolean
  error?: string
  missingFields?: Array<'displayName' | 'avatarUrl' | 'countyId' | 'categoryId' | 'skillsOffered'>
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type SkillOfferedRow = Database['public']['Tables']['skills_offered']['Row']
export type SkillWantedRow = Database['public']['Tables']['skills_wanted']['Row']

export interface ProfileWithRelations extends ProfileRow {
  skills_offered: SkillOfferedRow[]
  skills_wanted: SkillWantedRow[]
  counties?: { name: string } | null
  categories?: { id: number; name: string; slug: string } | null
}
