import { randomUUID } from 'node:crypto'
import { sign, verify } from './cookies'
import type { RateLimiter } from './ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CardResolution = { cardId: string; token: string; minted: boolean } | { blocked: true }

/** Prefer x-real-ip (Vercel sets this to the true client IP); else the LAST hop of
 * x-forwarded-for, since proxies append to that list and only the last entry is not
 * attacker-controlled (the first entry can be forged by whoever originates the request). */
export function clientIpFromHeaders(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return 'local'
}

/** Decide which card id this request owns. Pure: no DB, no I/O. */
export function resolveCard(
  existingToken: string | undefined,
  secret: string,
  ip: string,
  limiter: RateLimiter,
): CardResolution {
  const existing = verify(existingToken, secret)
  if (existing && UUID_RE.test(existing)) return { cardId: existing, token: existingToken as string, minted: false }
  if (!limiter.check(ip)) return { blocked: true }
  const cardId = randomUUID()
  return { cardId, token: sign(cardId, secret), minted: true }
}
