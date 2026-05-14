import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('quest security migrations', () => {
  it('hardens reward rpc execution and uses UTC dates for streak progression', () => {
    const migration = readRepoFile('supabase/migrations/20260514113000_secure_referral_and_streak.sql')

    expect(migration).toContain("v_today_utc date := public.utc_day(now());")
    expect(migration).toContain("elsif v_last_login_utc = (v_today_utc - 1) then")
    expect(migration).toContain('revoke all on function public.update_login_streak(uuid) from public;')
    expect(migration).toContain('revoke all on function public.update_login_streak(uuid) from anon;')
    expect(migration).toContain('revoke all on function public.award_referral_credits(uuid) from public;')
    expect(migration).toContain('revoke all on function public.award_referral_credits(uuid) from anon;')
    expect(migration).toContain('grant execute on function public.award_referral_credits(uuid) to authenticated;')
  })
})
