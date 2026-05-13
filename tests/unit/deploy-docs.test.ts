import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('deployment docs', () => {
  it('documents the current Supabase publishable key name', () => {
    const deployDoc = readRepoFile('docs/DEPLOY.md')

    expect(deployDoc).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(deployDoc).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('references the current Stripe billing migration filename', () => {
    const deployDoc = readRepoFile('docs/DEPLOY.md')

    expect(deployDoc).toContain('20260513050000_stripe_billing.sql')
    expect(deployDoc).not.toContain('20260513020000_tier_columns.sql')
  })

  it('points operators at the canonical billing deploy runbook', () => {
    const rootDeployDoc = readRepoFile('DEPLOY.md')

    expect(rootDeployDoc).toContain('docs/DEPLOY.md')
    expect(rootDeployDoc).toContain('STRIPE_WEBHOOK_SECRET')
  })
})
