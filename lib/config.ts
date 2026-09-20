export const EVENT = {
  slug: 'pilot-market',
  name: 'Saturday Market',
  date: '2026-11-07', // YYYY-MM-DD; the card's month/day/weekday derive from this
  venue: 'Tiong Bahru CC',
  rewardText: 'Collect five and take home a matcha, on us.',
  actions: [
    { key: 'booth', label: 'Visit a booth', position: 1 },
    { key: 'photostrip', label: 'Take a photostrip', position: 2 },
    { key: 'follow', label: 'Follow @unwoventhread', position: 3 },
    { key: 'workshop', label: 'Join a workshop', position: 4 },
    { key: 'thrift', label: 'Thrift something', position: 5 },
  ],
} as const

export const POLL_MS = 4000
export const STATS_POLL_MS = 10000

export const COPY = {
  handle: '@unwoventhread',
  complete: 'All five. Show this at the counter for your matcha.',
  redeemed: 'Enjoyed — see you next time.',
  unavailable: 'Card unavailable — find a staff member.',
  accent: 'stitch with us',
} as const

export const TICKER_WORDS = ['thrift', 'workshop', 'cafe', 'music', 'people', 'curating conscious community'] as const
