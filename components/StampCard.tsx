import { useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { rewardCopy } from '@/lib/reward'
import { ChopCursor } from './ChopCursor'
import styles from './StampCard.module.css'

export type StampCardProps = {
  month: string
  day: string
  weekday: string
  meta: { label: string; value: string }[]
  slots: { key: string; label: string }[]
  collected: string[]
  rewardText: string
  redeemedAt: string | null
  qrSvg?: string | null
  children?: ReactNode
  cardRef?: Ref<HTMLElement>
}

/** Random tilt for a chop: ±2–8°, never dead straight so every impression lands a little askew. */
function rollTilt(): number {
  const mag = 2 + Math.random() * 6
  return Math.random() < 0.5 ? -mag : mag
}

/** The tear-off day page.
 *  Stamps ("chops") are interactive: tapping a slot presses an inked red
 *  impression into it (amici.com-style rubber stamp: random tilt, ink grain,
 *  one 260ms press) and the reward line tracks progress. Slots already
 *  collected on load render filled and still. Until the database lands, state
 *  is local; the DB-backed card (Task 8/10) will seed `collected` and drive
 *  this through the polling hook instead. */
export function StampCard({ month, day, weekday, meta, slots, collected, rewardText, redeemedAt, qrSvg, children, cardRef }: StampCardProps) {
  const [on, setOn] = useState<Set<string>>(() => new Set(collected))
  // Slots chopped in this session — only these animate.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  // One tilt per slot key, rolled on first chop and kept so re-renders don't re-roll it.
  const [tilts, setTilts] = useState<Map<string, number>>(() => new Map())
  const total = slots.length
  const count = on.size

  function toggle(key: string) {
    const wasOn = on.has(key)
    if (!wasOn && !tilts.has(key)) setTilts((prev) => new Map(prev).set(key, rollTilt()))
    setOn((prev) => {
      const next = new Set(prev)
      if (wasOn) next.delete(key)
      else next.add(key)
      return next
    })
    setFresh((prev) => {
      const next = new Set(prev)
      if (wasOn) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const reward = rewardCopy(count, total, redeemedAt, rewardText)

  return (
    <article className={styles.card} id="card" ref={cardRef}>
      <ChopCursor />
      <div className={styles.stub} />
      <div className={styles.dots} />
      <span className={styles.month}>{month}</span>
      <span className={styles.day}>{day}</span>
      <span className={styles.weekday}>{weekday}</span>
      <div className={styles.rule} />
      <div className={styles.micro}>
        {meta.map((m) => (
          <span key={m.label}>
            {m.label}
            <br />
            <b>{m.value}</b>
          </span>
        ))}
      </div>
      <div className={styles.rule} />
      <div className={styles.slots}>
        {slots.map((s, i) => {
          const isOn = on.has(s.key)
          return (
            <button
              type="button"
              key={s.key}
              className={styles.slot}
              aria-label={`Stamp ${i + 1} of ${total}, ${s.label}: ${isOn ? 'collected' : 'not yet'}`}
              aria-pressed={isOn}
              data-on={isOn ? '' : undefined}
              data-fresh={isOn && fresh.has(s.key) ? '' : undefined}
              style={{ '--chop-rot': `${(tilts.get(s.key) ?? 0).toFixed(1)}deg` } as CSSProperties}
              onClick={() => toggle(s.key)}
            >
              <i aria-hidden="true" />
              <em aria-hidden="true">{i + 1}</em>
            </button>
          )
        })}
      </div>
      <p className={styles.reward}>{reward}</p>
      {(qrSvg || children) && (
        <div className={styles.tail}>
          {children}
          {qrSvg && <div className={styles.qr} role="img" aria-label="Your card code" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
        </div>
      )}
    </article>
  )
}
