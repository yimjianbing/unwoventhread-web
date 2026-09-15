import Image from 'next/image'
import wordmark from '@/public/images/logo-wordmark.png'
import { PillButton } from './PillButton'
import styles from './Nav.module.css'

export function Nav() {
  return (
    <>
      <nav className={styles.nav}>
        <PillButton label="Menu" hoverLabel="Close" />
      </nav>
      <div className={styles.markpill}>
        <Image src={wordmark} alt="unwoventhread" className={styles.mark} priority />
      </div>
    </>
  )
}
