import { Fragment } from 'react'
import styles from './Ticker.module.css'

/** Four copies of the word list; the track scrolls -50% so the loop is seamless. */
export function Ticker({ words }: { words: readonly string[] }) {
  const seq = Array.from({ length: 4 }, () => words).flat()
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.track}>
        {seq.map((w, i) => (
          <Fragment key={i}>
            <span>{w}</span>
            <span>&bull;</span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
