import type { ReactNode, Ref } from 'react'
import styles from './StampCard.module.css'

export type StampCardProps = {
  month: string
  day: string
  weekday: string
  meta: { label: string; value: string }[]
  slots: { key: string; label: string }[]
  collected: string[]
  reward: string
  qrSvg?: string | null
  children?: ReactNode
  cardRef?: Ref<HTMLElement>
}

/** The tear-off day page. Presentational: whatever it is given, it draws. */
export function StampCard({ month, day, weekday, meta, slots, collected, reward, qrSvg, children, cardRef }: StampCardProps) {
  const total = slots.length
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
          const on = collected.includes(s.key)
          return (
            <span
              key={s.key}
              className={styles.slot}
              role="img"
              aria-label={`Stamp ${i + 1} of ${total}, ${s.label}: ${on ? 'collected' : 'not yet'}`}
              data-on={on ? '' : undefined}
            >
              <i aria-hidden="true" />
              <em aria-hidden="true">{i + 1}</em>
            </span>
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
