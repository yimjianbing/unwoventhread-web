import { Hero } from '@/components/Hero'
import { Ticker } from '@/components/Ticker'
import { AfterSection } from '@/components/AfterSection'
import { Footer } from '@/components/Footer'
import { EVENT, TICKER_WORDS } from '@/lib/config'
import styles from './page.module.css'

// The full attendee page (plan Task 13). The card renders its "unavailable"
// state until the database is provisioned (Task 7) — same layout, per spec:
// "If the DB is unreachable on /, render the full reference layout with the
// card's almanac lines replaced by 'Card unavailable — find a staff member.'"
export default function Page() {
  return (
    <>
      <Hero initial={null} qrSvg={null} />
      <p className={styles.overline}>
        <b>01</b> Your card <b>·</b> {EVENT.name}
      </p>
      <Ticker words={TICKER_WORDS} />
      <AfterSection />
      <Footer />
    </>
  )
}
