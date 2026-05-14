import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ENCRYPTION_PREFIX = 'v1'

function getPhoneEncryptionKey(): Buffer {
  const secret = process.env.PHONE_DATA_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('PHONE_DATA_ENCRYPTION_KEY is missing.')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptPhoneNumber(phoneNumber: string): string {
  const key = getPhoneEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(phoneNumber, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptPhoneNumber(payload: string): string {
  const [prefix, iv, tag, encrypted] = payload.split(':')
  if (prefix !== ENCRYPTION_PREFIX || !iv || !tag || !encrypted) {
    throw new Error('Invalid encrypted phone payload.')
  }

  const key = getPhoneEncryptionKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
