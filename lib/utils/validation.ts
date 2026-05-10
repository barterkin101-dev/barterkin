/**
 * Centralized input validation + sanitization wrapper for server actions.
 *
 * Combines Zod schema validation with text sanitization to ensure
 * all user inputs are cleaned before reaching the database.
 *
 * Usage in server actions:
 *   const result = validateAndSanitize(MySchema, rawInput)
 *   if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.fieldErrors }
 *   const clean = result.data
 */

import type { ZodSchema } from 'zod'
import { sanitizeText, sanitizeMultiline } from './sanitize'

export interface ValidationResult<T> {
  ok: true
  data: T
}

export interface ValidationError {
  ok: false
  error: string
  fieldErrors?: Record<string, string[]>
}

export type ValidateResult<T> = ValidationResult<T> | ValidationError

/**
 * Map of field names to sanitization strategy.
 * Fields not listed here pass through unchanged (Zod already validated).
 */
const SANITIZE_MULTILINE = new Set([
  'description',
  'bio',
  'content',
  'initialMessage',
  'note',
  'resolution',
  'reviewText',
  'subject',
  'reason',
])

const SANITIZE_SINGLELINE = new Set([
  'title',
  'displayName',
  'tradeTerms',
  'priceEstimate',
  'availability',
  'tiktokHandle',
])

function sanitizeParsed<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data } as Record<string, unknown>
  for (const key of Object.keys(out)) {
    const val = out[key]
    if (typeof val !== 'string') continue
    if (SANITIZE_MULTILINE.has(key)) {
      out[key] = sanitizeMultiline(val)
    } else if (SANITIZE_SINGLELINE.has(key)) {
      out[key] = sanitizeText(val)
    }
  }
  return out as T
}

export function validateAndSanitize<T>(
  schema: ZodSchema<T>,
  input: unknown,
): ValidateResult<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    const firstIssue = parsed.error.issues[0]
    const field = firstIssue?.path.join('.') ?? 'input'
    return {
      ok: false,
      error: `${field}: ${firstIssue?.message ?? 'Please fix the highlighted fields.'}`,
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
    }
  }

  // Sanitize string fields after successful schema validation
  const sanitized = sanitizeParsed(parsed.data as Record<string, unknown>)
  return { ok: true, data: sanitized as T }
}

/**
 * Lightweight wrapper for non-form inputs (e.g. RPC args, query params).
 * Returns the parsed value or null on failure (logs internally).
 */
export function safeParse<T>(schema: ZodSchema<T>, input: unknown): T | null {
  const result = schema.safeParse(input)
  if (!result.success) {
    console.warn('[safeParse] validation failed', { issues: result.error.issues.length })
    return null
  }
  return result.data
}
