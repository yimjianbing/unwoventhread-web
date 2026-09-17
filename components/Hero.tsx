'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import photo from '@/public/images/photo-venue.png'
import { StampCard } from './StampCard'
import { formatCardDate } from '@/lib/date'
import { COPY, EVENT } from '@/lib/config'
import type { CardState } from '@/lib/card-state'
import styles from './Hero.module.css'

type Props = { initial: CardState | null; qrSvg: string | null }

export function Hero({ initial, qrSvg }: Props) {
  const state = initial
  // NOTE: useCardState polling hook lands with the server actions (plan Task 13, step 1).
  const stageRef = useRef<HTMLElement>(null)
  const groundRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)

  // Scroll-driven rotation + parallax, ported from the reference. One rAF per scroll event.
  useEffect(() => {
    const stage = stageRef.current, ground = groundRef.current, wrap = wrapRef.current, card = cardRef.current
    if (!stage || !ground || !wrap || !card) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.style.transform = 'none'
      return
    }
    let raf: number | null = null
    const apply = () => {
      raf = null
      const r = stage.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)))
      const e = Math.min(1, p * 1.9)
    // The card travels across the viewport as the page scrolls: in from the
    // left (partly off-screen), swinging up and right past centre, settling
    // high on the right. Rotation + scale ride along so it reads as a card
    // being carried, not slid.
    // Starts low, left of centre and tilted (partly out of the frame);
    // as the page scrolls it swings up and lands exactly centered.
    const wide = innerWidth >= 900 ? 1 : 0.4 // phones: gentler sideways pull
    card.style.transform =
      `translateX(${((-8 + 8 * e) * wide).toFixed(2)}vw) ` +
      `rotate(${(-11 + 11 * e).toFixed(2)}deg) ` +
      `translateY(${(10 - 10 * e).toFixed(2)}%) ` +
      `scale(${(0.89 + 0.11 * e).toFixed(3)})`
    wrap.toggleAttribute('data-lift', e > 0.75)
    // Background drifts against the scroll (slower on screen = farther away).
    ground.style.transform = `translateY(${((p - 0.5) * 0.32 * r.height).toFixed(1)}px) scale(1.06)`
    }
    const schedule = () => {
      if (raf === null) raf = requestAnimationFrame(apply)
    }
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    apply()
    return () => {
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  const date = formatCardDate(state?.event.date ?? EVENT.date)
  const meta = state
    ? [
        { label: 'Member', value: state.name?.trim() || `#${String(state.number).padStart(4, '0')}` },
        { label: 'Event', value: state.event.name },
        { label: 'Venue', value: state.event.venue },
        { label: 'Follow', value: COPY.handle },
      ]
    : [
        { label: 'Member', value: COPY.unavailable },
        { label: 'Event', value: EVENT.name },
        { label: 'Venue', value: EVENT.venue },
        { label: 'Follow', value: COPY.handle },
      ]
  const slots = state ? state.slots : EVENT.actions.map((a) => ({ key: a.key, label: a.label }))
  return (
    <section className={styles.stage} ref={stageRef}>
      <div className={styles.ground} ref={groundRef}>
        <Image src={photo} alt="" fill sizes="100vw" priority placeholder="blur" />
      </div>
      <div className={styles.oval}>{COPY.accent}</div>
      <div className={styles.cardwrap} ref={wrapRef}>
        <StampCard
          cardRef={cardRef}
          month={date.month}
          day={date.day}
          weekday={date.weekday}
          meta={meta}
        slots={slots}
        collected={state?.collected ?? []}
        rewardText={state?.event.rewardText ?? EVENT.rewardText}
        redeemedAt={state?.redeemedAt ?? null}
        qrSvg={qrSvg}
      />
      </div>
    </section>
  )
}
