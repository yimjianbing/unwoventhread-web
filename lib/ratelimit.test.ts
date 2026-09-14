import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './ratelimit'

describe('createRateLimiter', () => {
  it('allows up to limit then blocks', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })
  it('keys are independent', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
  })
  it('frees up after the window passes', () => {
    let t = 0
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    expect(rl.check('a')).toBe(true)
    t = 999
    expect(rl.check('a')).toBe(false)
    t = 1001
    expect(rl.check('a')).toBe(true)
  })
})
