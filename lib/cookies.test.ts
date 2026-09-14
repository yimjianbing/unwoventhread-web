import { describe, expect, it } from 'vitest'
import { sign, verify, safeEqual, getSecret } from './cookies'

const SECRET = 'test-secret-with-enough-length'

describe('sign/verify', () => {
  it('round-trips a value', () => {
    const token = sign('abc-123', SECRET)
    expect(token.startsWith('abc-123.')).toBe(true)
    expect(verify(token, SECRET)).toBe('abc-123')
  })
  it('rejects a tampered value', () => {
    const token = sign('abc-123', SECRET)
    expect(verify('abd-123.' + token.split('.')[1], SECRET)).toBeNull()
  })
  it('rejects a wrong secret', () => {
    expect(verify(sign('x', SECRET), SECRET + 'z')).toBeNull()
  })
  it('rejects missing or malformed tokens', () => {
    expect(verify(undefined, SECRET)).toBeNull()
    expect(verify(null, SECRET)).toBeNull()
    expect(verify('', SECRET)).toBeNull()
    expect(verify('no-dot', SECRET)).toBeNull()
    expect(verify('.sig-only', SECRET)).toBeNull()
  })
})

describe('safeEqual', () => {
  it('compares strings of equal and unequal length', () => {
    expect(safeEqual('1234', '1234')).toBe(true)
    expect(safeEqual('1234', '1235')).toBe(false)
    expect(safeEqual('1234', '123')).toBe(false)
  })
})

describe('getSecret', () => {
  it('throws when unset or short', () => {
    const prev = process.env.CARD_COOKIE_SECRET
    process.env.CARD_COOKIE_SECRET = 'short'
    expect(() => getSecret()).toThrow()
    delete process.env.CARD_COOKIE_SECRET
    expect(() => getSecret()).toThrow()
    process.env.CARD_COOKIE_SECRET = prev
  })
})
