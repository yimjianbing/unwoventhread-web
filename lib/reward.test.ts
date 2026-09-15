import { expect, it } from 'vitest'
import { rewardCopy } from './reward'
import { COPY } from './config'

it('picks copy by progress and redemption', () => {
  expect(rewardCopy(2, 5, null, 'Collect five.')).toBe('Collect five.')
  expect(rewardCopy(5, 5, null, 'Collect five.')).toBe(COPY.complete)
  expect(rewardCopy(5, 5, '2026-10-11T05:00:00Z', 'Collect five.')).toBe(COPY.redeemed)
  expect(rewardCopy(3, 3, null, 'x')).toBe(COPY.complete)
})
