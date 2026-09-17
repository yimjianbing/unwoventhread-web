'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import styles from './ChopCursor.module.css'

const noop = () => () => {}
const canHover = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches

/** Round "stamp" badge that replaces the pointer while it is over the parent
 *  element (amici.com's CLIC cursor). Fine-pointer devices only; touch just taps.
 *  The badge itself is portalled to <body>: the card is rotated and masked, so a
 *  fixed child would be positioned against the card and clipped by its edge. */
export function ChopCursor() {
  const anchor = useRef<HTMLSpanElement>(null)
  const badge = useRef<HTMLDivElement>(null)
  const enabled = useSyncExternalStore(noop, canHover, () => false)

  useEffect(() => {
    const b = badge.current, el = anchor.current?.parentElement
    if (!enabled || !b || !el) return
    let raf: number | null = null, x = 0, y = 0
    const paint = () => {
      raf = null
      b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    }
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY
      if (raf === null) raf = requestAnimationFrame(paint)
    }
    const enter = (e: PointerEvent) => { move(e); b.toggleAttribute('data-show', true) }
    const leave = () => b.toggleAttribute('data-show', false)
    const down = () => b.toggleAttribute('data-press', true)
    const up = () => b.toggleAttribute('data-press', false)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    el.classList.add(styles.hide)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      el.classList.remove(styles.hide)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <span ref={anchor} hidden />
      {createPortal(
        <div className={styles.badge} ref={badge} aria-hidden="true">
          Stamp
        </div>,
        document.body,
      )}
    </>
  )
}
