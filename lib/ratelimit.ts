export type RateLimiter = { check(key: string): boolean }

/** In-memory sliding-window limiter. Per-instance; good enough for a one-day event. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const now = opts.now ?? Date.now
  const hits = new Map<string, number[]>()
  return {
    check(key) {
      const t = now()
      const recent = (hits.get(key) ?? []).filter((x) => x > t - opts.windowMs)
      if (recent.length >= opts.limit) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.set(key, recent)
      return true
    },
  }
}
