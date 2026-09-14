import { NextResponse, type NextRequest } from 'next/server'
import { CARD_COOKIE, getSecret } from '@/lib/cookies'
import { createRateLimiter } from '@/lib/ratelimit'
import { resolveCard } from '@/lib/issue-card'

// 5 new cards per IP per 10 minutes — stops a script inflating the attendee count.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const r = resolveCard(request.cookies.get(CARD_COOKIE)?.value, getSecret(), ip, limiter)
  if ('blocked' in r || !r.minted) return NextResponse.next()

  // Forward the new cookie on this same request so the page render already sees it.
  const headers = new Headers(request.headers)
  const prior = headers.get('cookie')
  headers.set('cookie', prior ? `${prior}; ${CARD_COOKIE}=${r.token}` : `${CARD_COOKIE}=${r.token}`)
  const res = NextResponse.next({ request: { headers } })
  res.cookies.set({
    name: CARD_COOKIE,
    value: r.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

export const config = { matcher: '/' }
