import { randomUUID } from 'node:crypto'
import { sign, verify } from './cookies'
import type { RateLimiter } from './ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CardResolution = { cardId: string; token: string; minted: boolean } | { blocked: true }

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
