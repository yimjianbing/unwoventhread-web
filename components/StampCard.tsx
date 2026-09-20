import { useState } from 'react'
import type { CSSProperties, MouseEvent, ReactNode, Ref } from 'react'
import Image from 'next/image'
import emblem from '@/public/images/logo-emblem.png'
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

/** A free emblem chop pressed onto the paper: card-local coordinates, its own tilt and ink density. */
type Chop = { id: number; x: number; y: number; rot: number; ink: number }
const MAX_CHOPS = 12

/** Client point → card-local point. The card is rotated (and translated) on scroll; the centre
 *  of its bounding box is the image of its own centre under any rotation or translation, so
 *  un-rotating around that centre is exact. */
function toLocal(card: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const r = card.getBoundingClientRect()
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const deg = parseFloat(getComputedStyle(card).rotate) || 0
  const a = (-deg * Math.PI) / 180
  const dx = clientX - cx, dy = clientY - cy
  return {
    x: card.offsetWidth / 2 + dx * Math.cos(a) - dy * Math.sin(a),
    y: card.offsetHeight / 2 + dx * Math.sin(a) + dy * Math.cos(a),
  }
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
  // Emblem chops pressed anywhere on the paper this session; oldest lifted past MAX_CHOPS.
  const [chops, setChops] = useState<Chop[]>([])
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

  function press(e: MouseEvent<HTMLElement>) {
    // Slots (and any other control) handle their own press; only bare paper takes an emblem.
    if ((e.target as HTMLElement).closest('button, a, input')) return
    const { x, y } = toLocal(e.currentTarget, e.clientX, e.clientY)
    const chop: Chop = { id: Date.now() + Math.random(), x, y, rot: (Math.random() * 2 - 1) * 20, ink: 0.6 + Math.random() * 0.35 }
    setChops((prev) => [...prev, chop].slice(-MAX_CHOPS))
  }

  const reward = rewardCopy(count, total, redeemedAt, rewardText)

  return (
    <article className={styles.card} id="card" ref={cardRef} onClick={press}>
      <ChopCursor />
      <div className={styles.chops} aria-hidden="true">
        {chops.map((c) => (
          <Image
            key={c.id}
            src={emblem}
            width={616}
            height={561}
            alt=""
            data-chop=""
            className={styles.chop}
            style={{ left: c.x, top: c.y, '--chop-rot': `${c.rot.toFixed(1)}deg`, '--chop-ink': c.ink.toFixed(2) } as CSSProperties}
          />
        ))}
      </div>
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
