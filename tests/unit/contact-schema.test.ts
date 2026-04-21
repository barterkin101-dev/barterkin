import { describe, it, expect } from 'vitest'
import {
  MessageSchema,
  ReportReasonEnum,
  ReportSchema,
  BlockSchema,
} from '@/lib/schemas/contact'

// CONT-02, CONT-03
describe('MessageSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'
  const valid = {
    recipientProfileId: validUuid,
    message: 'Hello, I would love to barter skills with you!',
  }

  it('accepts a valid message with a UUID recipient', () => {
    const result = MessageSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects message shorter than 20 chars (CONT-02 min 20)', () => {
    const result = MessageSchema.safeParse({ ...valid, message: 'x'.repeat(19) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 20/i)
    }
  })

  it('rejects message longer than 500 chars (CONT-02 max 500)', () => {
    const result = MessageSchema.safeParse({ ...valid, message: 'x'.repeat(501) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/500/i)
    }
  })

  it('accepts message of exactly 20 chars (lower boundary)', () => {
    const result = MessageSchema.safeParse({ ...valid, message: 'x'.repeat(20) })
    expect(result.success).toBe(true)
  })

  it('accepts message of exactly 500 chars (upper boundary)', () => {
    const result = MessageSchema.safeParse({ ...valid, message: 'x'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from message (CONT-02)', () => {
    const result = MessageSchema.safeParse({
      ...valid,
      message: '  ' + 'x'.repeat(25) + '  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe('x'.repeat(25))
    }
  })

  it('rejects non-UUID recipientProfileId (CONT-03)', () => {
    const result = MessageSchema.safeParse({ ...valid, recipientProfileId: 'not-a-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/invalid recipient/i)
    }
  })

  it('rejects message that becomes < 20 chars after trim', () => {
    const result = MessageSchema.safeParse({ ...valid, message: '  ' + 'x'.repeat(5) + '  ' })
    expect(result.success).toBe(false)
  })
})

// TRUST-01
describe('ReportReasonEnum', () => {
  it('accepts "harassment"', () => {
    expect(ReportReasonEnum.safeParse('harassment').success).toBe(true)
  })

  it('accepts "spam"', () => {
    expect(ReportReasonEnum.safeParse('spam').success).toBe(true)
  })

  it('accepts "off-topic"', () => {
    expect(ReportReasonEnum.safeParse('off-topic').success).toBe(true)
  })

  it('accepts "impersonation"', () => {
    expect(ReportReasonEnum.safeParse('impersonation').success).toBe(true)
  })

  it('accepts "other"', () => {
    expect(ReportReasonEnum.safeParse('other').success).toBe(true)
  })

  it('rejects an unknown reason value', () => {
    expect(ReportReasonEnum.safeParse('invalid-reason').success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(ReportReasonEnum.safeParse('').success).toBe(false)
  })
})

// TRUST-01, TRUST-05
describe('ReportSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'
  const valid = {
    targetProfileId: validUuid,
    reason: 'spam' as const,
  }

  it('accepts a valid report without note', () => {
    const result = ReportSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts a valid report with a note', () => {
    const result = ReportSchema.safeParse({ ...valid, note: 'Sent me an irrelevant offer' })
    expect(result.success).toBe(true)
  })

  it('accepts an empty string note (TRUST-05)', () => {
    const result = ReportSchema.safeParse({ ...valid, note: '' })
    expect(result.success).toBe(true)
  })

  it('rejects note over 500 chars (TRUST-05 abuse prevention)', () => {
    const result = ReportSchema.safeParse({ ...valid, note: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID targetProfileId', () => {
    const result = ReportSchema.safeParse({ ...valid, targetProfileId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reason enum value', () => {
    const result = ReportSchema.safeParse({ ...valid, reason: 'bad-reason' as never })
    expect(result.success).toBe(false)
  })
})

// TRUST-02
describe('BlockSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'
  const valid = {
    blockedOwnerId: validUuid,
    blockedDisplayName: 'Kerry Smith',
    blockedUsername: 'kerry-smith',
  }

  it('accepts a valid block payload', () => {
    const result = BlockSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID blockedOwnerId', () => {
    const result = BlockSchema.safeParse({ ...valid, blockedOwnerId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects empty blockedDisplayName', () => {
    const result = BlockSchema.safeParse({ ...valid, blockedDisplayName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects blockedDisplayName over 60 chars', () => {
    const result = BlockSchema.safeParse({ ...valid, blockedDisplayName: 'a'.repeat(61) })
    expect(result.success).toBe(false)
  })
})
