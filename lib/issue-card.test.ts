import { describe, expect, it } from 'vitest'
import { resolveCard, clientIpFromHeaders } from './issue-card'
import { sign, verify } from './cookies'
import { createRateLimiter } from './ratelimit'

const SECRET = 'test-secret-with-enough-length'
const UUID = '5d1f2a4e-9c3b-4a7e-8f1d-2b6c7e8f9a0b'
const always = { check: () => true }

describe('resolveCard', () => {
  it('keeps a valid existing card', () => {
    const token = sign(UUID, SECRET)
    expect(resolveCard(token, SECRET, '1.1.1.1', always)).toEqual({ cardId: UUID, token, minted: false })
  })
  it('mints a new signed uuid when missing', () => {
    const r = resolveCard(undefined, SECRET, '1.1.1.1', always)
    if ('blocked' in r) throw new Error('unexpected block')
    expect(r.minted).toBe(true)
    expect(r.cardId).toMatch(/^[0-9a-f-]{36}$/)
    expect(verify(r.token, SECRET)).toBe(r.cardId)
  })
  it('re-mints when the token is tampered or not a uuid', () => {
    const r1 = resolveCard('bad.token', SECRET, '1.1.1.1', always)
    expect('minted' in r1 && r1.minted).toBe(true)
    const r2 = resolveCard(sign('not-a-uuid', SECRET), SECRET, '1.1.1.1', always)
    expect('minted' in r2 && r2.minted).toBe(true)
  })
  it('blocks minting when the limiter says no, but never blocks existing cards', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect('minted' in resolveCard(undefined, SECRET, 'ip', rl)).toBe(true)
    expect(resolveCard(undefined, SECRET, 'ip', rl)).toEqual({ blocked: true })
    expect('minted' in resolveCard(sign(UUID, SECRET), SECRET, 'ip', rl)).toBe(true)
  })
})

describe('clientIpFromHeaders', () => {
  it('prefers x-real-ip over x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })
    expect(clientIpFromHeaders(headers)).toBe('9.9.9.9')
  })
  it('returns the last entry of a multi-hop x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' })
    expect(clientIpFromHeaders(headers)).toBe('3.3.3.3')
  })
  it('trims whitespace and skips trailing empty entries in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': ' 1.1.1.1 , 2.2.2.2 , ' })
    expect(clientIpFromHeaders(headers)).toBe('2.2.2.2')
  })
  it('falls back to local when no relevant headers are present', () => {
    expect(clientIpFromHeaders(new Headers())).toBe('local')
  })
})
