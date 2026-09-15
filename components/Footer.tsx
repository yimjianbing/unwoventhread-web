import Image from 'next/image'
import logoAlt from '@/public/images/logo-alt.png'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Image src={logoAlt} alt="unwoventhread" className={styles.logo} />
        <div className={styles.links}>
          <a href="https://instagram.com/unwoventhread">Instagram</a>
          <a href="https://t.me/unwoventhread">Telegram</a>
          <a href="https://tiktok.com/@unwovent">TikTok</a>
          <a href="mailto:unwoventhread@gmail.com">unwoventhread@gmail.com</a>
        </div>
      </div>
    </footer>
  )
}
