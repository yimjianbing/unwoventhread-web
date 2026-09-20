/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  rewardText: 'Collect three.',
  redeemedAt: null,
}

it('renders one slot per action with collected state', () => {
  render(<StampCard {...base} />)
  const slots = screen.getAllByRole('button', { name: /Stamp \d of 3/ })
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

it('tapping a slot stamps it and updates the reward line', () => {
  render(<StampCard {...base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Stamp 2 of 3, Take a photostrip: not yet' }))
  expect(screen.getByRole('button', { name: 'Stamp 2 of 3, Take a photostrip: collected' })).toHaveAttribute('data-on')
  fireEvent.click(screen.getByRole('button', { name: 'Stamp 3 of 3, Follow: not yet' }))
  expect(screen.getByText('All five. Show this at the counter for your matcha.')).toBeInTheDocument()
})

it('a chop lands with a stable random tilt; only slots stamped this session are fresh', () => {
  const { rerender } = render(<StampCard {...base} />)
  const preStamped = screen.getByRole('button', { name: /Stamp 1 of 3/ })
  expect(preStamped).toHaveAttribute('data-on')
  expect(preStamped).not.toHaveAttribute('data-fresh')

  const slot = screen.getByRole('button', { name: /Stamp 2 of 3/ })
  fireEvent.click(slot)
  expect(slot).toHaveAttribute('data-on')
  expect(slot).toHaveAttribute('data-fresh')
  const rot = parseFloat(slot.style.getPropertyValue('--chop-rot'))
  expect(Math.abs(rot)).toBeLessThanOrEqual(8)
  expect(Math.abs(rot)).toBeGreaterThan(0)

  rerender(<StampCard {...base} rewardText="changed" />)
  expect(parseFloat(slot.style.getPropertyValue('--chop-rot'))).toBe(rot)

  fireEvent.click(slot)
  expect(slot).not.toHaveAttribute('data-on')
  expect(slot).not.toHaveAttribute('data-fresh')
})

it('clicking the paper (not a slot) presses an emblem chop at the pointer, capped at 12', () => {
  const { container } = render(<StampCard {...base} />)
  const card = container.querySelector('#card') as HTMLElement
  const chops = () => container.querySelectorAll('img[data-chop]')
  expect(chops()).toHaveLength(0)

  fireEvent.click(card, { clientX: 100, clientY: 120 })
  expect(chops()).toHaveLength(1)
  const first = chops()[0] as HTMLElement
  const rot = parseFloat(first.style.getPropertyValue('--chop-rot'))
  expect(Math.abs(rot)).toBeLessThanOrEqual(20)
  const ink = parseFloat(first.style.getPropertyValue('--chop-ink'))
  expect(ink).toBeGreaterThanOrEqual(0.6)
  expect(ink).toBeLessThanOrEqual(0.95)

  // A slot press is a slot chop, never an emblem.
  fireEvent.click(screen.getByRole('button', { name: /Stamp 2 of 3/ }))
  expect(chops()).toHaveLength(1)

  for (let i = 0; i < 14; i++) fireEvent.click(card, { clientX: 50 + i, clientY: 60 })
  expect(chops()).toHaveLength(12)
})
