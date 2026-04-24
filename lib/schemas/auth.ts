import { z } from 'zod'

export const MagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  captchaToken: z.string().min(1).max(2048),
})

export interface SendMagicLinkResult {
  ok: boolean
  error?: string
}
