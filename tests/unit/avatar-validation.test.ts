import { describe, it, expect } from 'vitest'
import { isValidAvatarFile } from '@/lib/utils/avatar-validation'

function makeFile(size: number, type: string, name = 'a.jpg'): File {
  return new File([new Uint8Array(size)], name, { type })
}

// PROF-02: 2MB + JPG/PNG/WEBP gate
describe('isValidAvatarFile (PROF-02)', () => {
  it('accepts image/jpeg at 1_000_000 bytes', () => {
    const result = isValidAvatarFile(makeFile(1_000_000, 'image/jpeg'))
    expect(result.ok).toBe(true)
  })

  it('accepts image/png', () => {
    const result = isValidAvatarFile(makeFile(1_000_000, 'image/png', 'a.png'))
    expect(result.ok).toBe(true)
  })

  it('accepts image/webp', () => {
    const result = isValidAvatarFile(makeFile(1_000_000, 'image/webp', 'a.webp'))
    expect(result.ok).toBe(true)
  })

  it("rejects application/pdf with code 'WRONG_TYPE'", () => {
    const result = isValidAvatarFile(makeFile(1_000, 'application/pdf', 'a.pdf'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('WRONG_TYPE')
  })

  it("rejects image/gif with code 'WRONG_TYPE'", () => {
    const result = isValidAvatarFile(makeFile(1_000, 'image/gif', 'a.gif'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('WRONG_TYPE')
  })

  it("rejects image/jpeg at 3MB with code 'TOO_LARGE'", () => {
    const result = isValidAvatarFile(makeFile(3 * 1024 * 1024, 'image/jpeg'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('TOO_LARGE')
  })

  it('accepts exactly 2*1024*1024 bytes (boundary inclusive)', () => {
    const result = isValidAvatarFile(makeFile(2 * 1024 * 1024, 'image/jpeg'))
    expect(result.ok).toBe(true)
  })
})
