export function normalizePhoneNumber(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (input.trim().startsWith('+') && digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`
  }

  return null
}

export function maskPhoneNumber(input: string | null | undefined): string | null {
  if (!input) return null

  const digits = input.replace(/\D/g, '')
  if (digits.length < 4) return null

  return `••• ••• ${digits.slice(-4)}`
}
