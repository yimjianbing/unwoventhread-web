/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PillButton } from './PillButton'

it('renders the label twice (visible + swap copy) as a button by default', () => {
  render(<PillButton label="Menu" hoverLabel="Close" />)
  const btn = screen.getByRole('button', { name: 'Menu' })
  expect(btn).toBeInTheDocument()
  expect(btn.querySelectorAll('span')).toHaveLength(2)
})

it('renders an anchor when href is given', () => {
  render(<PillButton label="Collect a stamp" variant="cta" href="#card" />)
  expect(screen.getByRole('link', { name: 'Collect a stamp' })).toHaveAttribute('href', '#card')
})
