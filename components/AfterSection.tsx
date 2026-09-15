import { PillButton } from './PillButton'
import styles from './AfterSection.module.css'

const STEPS = [
  { n: '01', title: 'We collect', body: "Unsold pieces from partner thrift stores, intercepted before they're landfilled." },
  { n: '02', title: 'You rework', body: 'Customise, patch, paint or restyle with us. No sewing experience needed.' },
  { n: '03', title: 'Everyone stays', body: "There's food. There's music. There's space to make." },
]

export function AfterSection() {
  return (
    <section className={styles.after}>
      <div className={styles.lede}>
        <div>
          <span className={styles.num}>02 — The card</span>
          <h2 className={styles.h2}>
            one stamp
            <br />
            per action<span className={styles.accent}>easy</span>
          </h2>
        </div>
        <div>
          <p>Visit a booth, take a photostrip, follow us — the card fills up as the day does. Nothing to sign up for, nothing to download.</p>
          <p>Show your card at any station and we&rsquo;ll stamp it for you.</p>
          <PillButton variant="cta" label="Collect a stamp" href="#card" className={styles.cta} />
        </div>
      </div>

      <div className={styles.steps}>
        {STEPS.map((s) => (
          <div className={styles.step} key={s.n}>
            <span className={styles.num}>{s.n}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
