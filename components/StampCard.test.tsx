/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { StampCard } from './StampCard'

afterEach(cleanup)

const base = {
  month: 'October',
  day: '11',
  weekday: 'Saturday',
  meta: [{ label: 'Member', value: 'Jia Wen' }, { label: 'Event', value: 'Pilot Market' }],
  slots: [
    { key: 'a', label: 'Visit a booth' },
    { key: 'b', label: 'Take a photostrip' },
    { key: 'c', label: 'Follow' },
  ],
  collected: ['a'],
  reward: 'Collect three.',
}

it('renders one slot per action with collected state', () => {
  render(<StampCard {...base} />)
  const slots = screen.getAllByRole('img', { name: /Stamp \d of 3/ })
  expect(slots).toHaveLength(3)
  expect(slots[0]).toHaveAttribute('aria-label', 'Stamp 1 of 3, Visit a booth: collected')
  expect(slots[0]).toHaveAttribute('data-on')
  expect(slots[1]).toHaveAttribute('aria-label', 'Stamp 2 of 3, Take a photostrip: not yet')
  expect(slots[1]).not.toHaveAttribute('data-on')
})

it('renders date, meta and reward copy', () => {
  render(<StampCard {...base} />)
  expect(screen.getByText('October')).toBeInTheDocument()
  expect(screen.getByText('11')).toBeInTheDocument()
  expect(screen.getByText('Saturday')).toBeInTheDocument()
  expect(screen.getByText('Jia Wen')).toBeInTheDocument()
  expect(screen.getByText('Collect three.')).toBeInTheDocument()
})
