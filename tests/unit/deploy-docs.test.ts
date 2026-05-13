import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const deployDocs = ['docs/DEPLOY.md', 'DEPLOY.md'] as const

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('deployment docs', () => {
  it('documents the current Supabase publishable key name in every deploy runbook', () => {
    for (const relativePath of deployDocs) {
      const deployDoc = readRepoFile(relativePath)

      expect(deployDoc, relativePath).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
      expect(deployDoc, relativePath).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
  })

  it('references the current Stripe billing migration filename and the file exists', () => {
    const currentMigration = '20260513050000_stripe_billing.sql'
    const deployDoc = readRepoFile('docs/DEPLOY.md')

    expect(deployDoc).toContain(currentMigration)
    expect(deployDoc).not.toContain('20260513020000_tier_columns.sql')
    expect(() => readRepoFile(`supabase/migrations/${currentMigration}`)).not.toThrow()
  })

  it('points operators at the canonical billing deploy runbook', () => {
    const rootDeployDoc = readRepoFile('DEPLOY.md')

    expect(rootDeployDoc).toContain('docs/DEPLOY.md')
    expect(rootDeployDoc).toContain('STRIPE_WEBHOOK_SECRET')
  })
})
