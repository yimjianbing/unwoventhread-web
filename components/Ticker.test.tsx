/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Ticker } from './Ticker'

it('repeats the word list four times for a seamless -50% loop', () => {
  const { container } = render(<Ticker words={['a', 'b']} />)
  const text = container.textContent ?? ''
  expect(text.split('a').length - 1).toBe(4)
  expect(text.split('b').length - 1).toBe(4)
})
