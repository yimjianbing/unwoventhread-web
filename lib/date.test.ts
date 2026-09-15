import { expect, it } from 'vitest'
import { formatCardDate } from './date'

it('formats an ISO date into month/day/weekday without timezone drift', () => {
  expect(formatCardDate('2025-10-11')).toEqual({ month: 'October', day: '11', weekday: 'Saturday' })
  expect(formatCardDate('2026-01-01')).toEqual({ month: 'January', day: '1', weekday: 'Thursday' })
})
