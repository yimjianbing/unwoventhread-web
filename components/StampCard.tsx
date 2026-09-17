import { useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { rewardCopy } from '@/lib/reward'
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

/** The tear-off day page.
 *  Stamps ("chops") are interactive: tapping a slot fills it with the reference
 *  scale animation and the reward line tracks progress. Until the database
 *  lands, state is local; the DB-backed card (Task 8/10) will seed `collected`
 *  and drive this through the polling hook instead. */
export function StampCard({ month, day, weekday, meta, slots, collected, rewardText, redeemedAt, qrSvg, children, cardRef }: StampCardProps) {
  const [on, setOn] = useState<Set<string>>(() => new Set(collected))
  const total = slots.length
  const count = on.size

  function toggle(key: string) {
    setOn((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const reward = rewardCopy(count, total, redeemedAt, rewardText)

  return (
    <article className={styles.card} id="card" ref={cardRef}>
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
