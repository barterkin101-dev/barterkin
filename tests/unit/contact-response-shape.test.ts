// FILLED IN: Plan 03 — Edge Function response privacy invariant (CONT-06)
// Static source analysis of send-contact/index.ts to verify recipient PII never appears in responses.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('CONT-06 — Edge Function response never includes recipient PII', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'supabase/functions/send-contact/index.ts'),
    'utf8',
  )

  it('success response returns only ok + contact_id', () => {
    // Match the success return pattern: json({ ok: true, contact_id: ... })
    const successMatches = src.match(/json\(\s*\{\s*ok:\s*true[^}]+\}/g) ?? []
    expect(successMatches.length).toBeGreaterThan(0)
    for (const m of successMatches) {
      expect(m).not.toMatch(/recipient_email/)
      expect(m).not.toMatch(/\bemail\s*:/i)
      expect(m).not.toMatch(/\bto\s*:/)
      expect(m).not.toMatch(/display_name/)
      // Allow only ok + contact_id keys
      const keys = m.match(/(\w+)\s*:/g)?.map((k) => k.replace(':', '').trim()) ?? []
      for (const k of keys) {
        expect(['ok', 'contact_id']).toContain(k)
      }
    }
  })

  it('error responses never include recipient PII', () => {
    // Match all json({ code: '...', error: ... }) calls
    const errorMatches =
      src.match(/json\(\s*\{\s*code:\s*'[^']+',\s*error:\s*[^}]+\}/g) ?? []
    expect(errorMatches.length).toBeGreaterThanOrEqual(5)
    for (const m of errorMatches) {
      expect(m).not.toMatch(/recipient_email/)
      expect(m).not.toMatch(/\.email/)
    }
  })

  it('response shape never exposes the to: field', () => {
    // The `to:` field is only used inside resend.emails.send() — never in a json() response
    const jsonCalls = src.match(/json\(\s*\{[^)]+\}/g) ?? []
    for (const call of jsonCalls) {
      expect(call).not.toMatch(/\bto\s*:/)
    }
  })
})
