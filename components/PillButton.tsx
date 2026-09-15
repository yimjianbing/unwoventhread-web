import styles from './PillButton.module.css'

type Props = {
  label: string
  hoverLabel?: string
  variant?: 'pill' | 'cta'
  href?: string
  onClick?: () => void
  className?: string
}

/** Label slides up and out while a duplicate slides in from below (guideline: hover as a vertical swap). */
export function PillButton({ label, hoverLabel = label, variant = 'pill', href, onClick, className }: Props) {
  const cls = [styles[variant], className].filter(Boolean).join(' ')
  const inner = (
    <>
      <span>{label}</span>
      <span aria-hidden="true">{hoverLabel}</span>
    </>
  )
  if (href) {
    return (
      <a className={cls} href={href}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  )
}
