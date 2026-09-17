'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import photo from '@/public/images/photo-threads-duotone.jpg'
import { StampCard } from './StampCard'
import { formatCardDate } from '@/lib/date'
import { COPY, EVENT } from '@/lib/config'
import type { CardState } from '@/lib/card-state'
import styles from './Hero.module.css'

type Props = { initial: CardState | null; qrSvg: string | null }

export function Hero({ initial, qrSvg }: Props) {
  const state = initial
  // NOTE: useCardState polling hook lands with the server actions (plan Task 13, step 1).
  const groundRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)

  // Scroll-driven un-tilt + parallax, ported from reference/loyalty-card.html.
  // The stage is sticky inside a 160svh track, so over the first 60svh of scroll
  // the card rotates from --tilt to flat and rises 6%, while the ground drifts
  // up at 0.14x. One rAF per scroll event.
  useEffect(() => {
    const ground = groundRef.current, wrap = wrapRef.current, card = cardRef.current
    if (!ground || !wrap || !card) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.style.rotate = '0deg'
      return
    }
    let raf: number | null = null
    const apply = () => {
      raf = null
      const travel = innerHeight * 0.6
      const p = Math.min(1, Math.max(0, scrollY / travel))
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      const tilt = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt')) || 0
      card.style.rotate = `${(tilt - tilt * e).toFixed(2)}deg`
      card.style.transform = `translateY(${(4 - 6 * e).toFixed(2)}%)`
      wrap.toggleAttribute('data-lift', e > 0.7)
      ground.style.transform = `translateY(${(p * -0.14 * innerHeight).toFixed(1)}px) scale(1.06)`
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
    <div className={styles.track}>
      <section className={styles.stage}>
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
    </div>
  )
}
