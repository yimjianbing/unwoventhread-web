import { createHmac, timingSafeEqual } from 'node:crypto'

export const CARD_COOKIE = 'ut_card'
export const STAFF_COOKIE = 'ut_staff'

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Returns "<value>.<signature>". */
export function sign(value: string, secret: string): string {
  return `${value}.${hmac(value, secret)}`
}

/** Returns the signed value, or null if the token is missing, malformed, or tampered. */
export function verify(token: string | null | undefined, secret: string): string | null {
  if (!token) return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const value = token.slice(0, i)
  const sig = token.slice(i + 1)
  return safeEqual(sig, hmac(value, secret)) ? value : null
}

export function getSecret(): string {
  const s = process.env.CARD_COOKIE_SECRET
  if (!s || s.length < 16) throw new Error('CARD_COOKIE_SECRET must be set (16+ chars)')
  return s
}
