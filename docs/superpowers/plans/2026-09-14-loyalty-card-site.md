# unwoventhread Loyalty-Card Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js site where every Pilot Market attendee is auto-issued a tear-off calendar-page loyalty card, staff award stamps by scanning the card's QR, five stamps redeem a free matcha, and every card issued is counted.

**Architecture:** `proxy.ts` mints a signed card-ID cookie on first visit (no DB); the home page upserts the card row and renders the reference hero with real state, polling a server action for new stamps. `/staff` is PIN-gated and runs a QR scanner that calls award/redeem server actions. All DB logic lives in `lib/` as plain async functions with integration tests; server actions are thin cookie-checking wrappers.

**Tech Stack:** Next.js 16 (App Router, TypeScript, React 19), CSS Modules (no Tailwind), `next/font`, Neon Postgres via Vercel Marketplace, Drizzle ORM (`neon-http`), zod, `qrcode`, `html5-qrcode`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-14-loyalty-card-site-design.md`

## Global Constraints

- Brand: colours only from `tokens.css` (`--red #C31C1D`, `--cream #EFE7DA` and derived). No gradients (except the reference's ground vignette), no emoji, no Inter/Roboto/system fonts. Name is always lowercase `unwoventhread`.
- Reference CSS/markup from the design project's `reference/loyalty-card.html` is copied verbatim where possible; do not "improve" it.
- No Tailwind, no UI library. CSS Modules must use pure (class-scoped) selectors.
- Slot count is data-driven (`actions` rows), never hard-coded to five in UI or logic.
- Cookies: `ut_card` and `ut_staff`, HMAC-SHA256 signed with `CARD_COOKIE_SECRET`, httpOnly, SameSite=Lax.
- Server actions return typed result objects; they never throw to the client.
- `getDb()` is lazy; nothing touches `DATABASE_URL` at module top level.
- Env vars: `DATABASE_URL`, `CARD_COOKIE_SECRET`, `STAFF_PIN`. Never echo their values.
- Every task ends with `npm test` (where tests exist) and `npx tsc --noEmit` passing, then a commit. Commit messages end with the attribution lines given in the session's system reminder.
- Node 26 / npm 11 are on this machine. Vercel CLI is NOT installed yet (Task 7 installs it).

---

## File map

| Path | Responsibility |
| --- | --- |
| `app/layout.tsx` | html/body, font variables, `tokens.css`, `Grain`, `Frame`, `Nav` |
| `app/fonts.ts` | `next/font/local` Cooper BT + `next/font/google` Special Elite |
| `app/tokens.css` | global tokens + base reset (from design project, fonts removed) |
| `app/page.tsx` + `page.module.css` | attendee page: card upsert, composes sections |
| `app/staff/page.tsx` | staff page: PIN gate or console |
| `app/actions/card.ts` | server actions `getCardState`, `setName` |
| `app/actions/staff.ts` | server actions `login`, `staffAward`, `staffRedeem`, `staffStats`, `staffLookup` |
| `proxy.ts` | mints `ut_card` cookie on `/` |
| `lib/cookies.ts` | sign/verify/safeEqual/getSecret |
| `lib/ratelimit.ts` | in-memory sliding window |
| `lib/issue-card.ts` | `resolveCard` (pure decision used by proxy) |
| `lib/staff-session.ts` | staff token make/read with SGT end-of-day expiry |
| `lib/config.ts` | event seed data, copy, poll intervals, ticker words |
| `lib/date.ts` | `formatCardDate` |
| `lib/reward.ts` | `rewardCopy` |
| `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/seed.ts` | Drizzle schema, lazy client, seed script |
| `lib/card-state.ts` | `ensureCard`, `loadCardState`, `updateCardName` |
| `lib/staff-ops.ts` | `awardStamp`, `redeemCard`, `getEventStats`, `findCardIdByNumber` |
| `lib/qr.ts` | `renderQrSvg` |
| `components/Grain.tsx`, `Frame.tsx`, `furniture.module.css` | fixed page furniture |
| `components/PillButton.tsx` + css | vertical-swap label button (pill + cta variants) |
| `components/Nav.tsx` + css | menu pill + wordmark pill |
| `components/Ticker.tsx` + css | marquee |
| `components/AfterSection.tsx` + css | "02 — The card" prose + steps |
| `components/Footer.tsx` + css | footer |
| `components/StampCard.tsx` + css | the tear-off page (presentational) |
| `components/NameField.tsx` | optional name input |
| `components/Hero.tsx` + css | stage, ground, oval, motion, polling |
| `components/use-card-state.ts` | polling hook |
| `components/staff/*` | `PinForm`, `StaffConsole`, `Scanner`, `StatsBar`, `staff.module.css` |
| `public/images/*.png`, `public/fonts/cooper-bt/*.woff2` | brand assets |
| `vitest.config.ts`, `vitest.setup.ts` | tests |
| `drizzle.config.ts` | drizzle-kit |

---

### Task 1: Scaffold Next.js into the existing repo

**Files:**
- Create: everything `create-next-app` generates (`package.json`, `app/`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`)
- Delete: `app/globals.css`, `app/page.module.css`, `public/*.svg`

**Interfaces:**
- Produces: a building Next.js 16 TypeScript App Router project at the repo root, npm scripts `dev`, `build`, `start`, `lint`.

- [ ] **Step 1: Scaffold into a scratch dir (the repo root has non-template files, which create-next-app refuses)**

```bash
cd "/Users/user/github repos/unwoventhread-web"
SCRATCH=$(mktemp -d)
npx --yes create-next-app@latest "$SCRATCH/app" --yes --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --disable-git --skip-install
rsync -a "$SCRATCH/app/" ./
rm -rf "$SCRATCH"
```

- [ ] **Step 2: Remove template files that the design replaces**

```bash
rm -f app/globals.css app/page.module.css public/*.svg app/favicon.ico
```

- [ ] **Step 3: Replace `app/page.tsx` and `app/layout.tsx` with minimal placeholders so the build passes**

`app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`app/page.tsx`:
```tsx
export default function Page() {
  return <h1>unwoventhread</h1>
}
```

- [ ] **Step 4: Install and build**

```bash
npm install
npm run build
```
Expected: build succeeds, route `/` listed.

- [ ] **Step 5: Confirm `.gitignore` ignores `.env*` and `.next`, then commit**

```bash
grep -E '^\.env|^/?\.next' .gitignore
git add -A
git commit -m "Scaffold Next.js 16 app"
```

---

### Task 2: Pull brand assets from Claude Design and convert fonts

**Files:**
- Create: `public/images/logo-wordmark.png`, `public/images/logo-alt.png`, `public/images/photo-fabric-rolls.png`, `public/fonts/cooper-bt/*.woff2` (7 files)

**Interfaces:**
- Produces: the three PNGs and the seven woff2 faces at the paths above. Later tasks import them by these exact paths.

> **Main session only.** This task uses the `DesignSync` tool (authorized via `/design-login` in this session); subagents cannot call it. Project ID: `7a4e3e48-9588-45f8-8192-492e686029ea`.

- [ ] **Step 1: Fetch each binary with `DesignSync get_file` and decode**

For each `path` in:
```
loyalty-card-skill/assets/logo-wordmark.png
loyalty-card-skill/assets/logo-alt.png
loyalty-card-skill/assets/photo-fabric-rolls.png
loyalty-card-skill/assets/fonts/CooperLtBT-Regular.ttf
loyalty-card-skill/assets/fonts/CooperLtBT-Italic.ttf
loyalty-card-skill/assets/fonts/CooperMdBT-Regular.ttf
loyalty-card-skill/assets/fonts/CooperMdBT-Italic.ttf
loyalty-card-skill/assets/fonts/CooperLtBT-Bold.ttf
loyalty-card-skill/assets/fonts/CooperLtBT-BoldItalic.ttf
loyalty-card-skill/assets/fonts/CooperBlkBT-Regular.ttf
```
call `DesignSync { method: "get_file", projectId, path }`. The result has `content` (base64) and `truncated`. If `truncated: true` for any file, STOP and ask the user to download that file from claude.ai/design and drop it in place — do not proceed with a truncated asset. Otherwise write the base64 to the scratchpad and decode:

```bash
SCRATCH="/private/tmp/claude-501/-Users-user-github-repos-unwoventhread-web/0318c84f-01d0-436e-af0e-4ae55ef75b41/scratchpad"
mkdir -p "$SCRATCH/assets" public/images public/fonts/cooper-bt
# after writing $SCRATCH/assets/<name>.b64 for each file:
for f in "$SCRATCH"/assets/*.b64; do base64 -D -i "$f" -o "${f%.b64}"; done
mv "$SCRATCH"/assets/*.png public/images/
file public/images/*.png "$SCRATCH"/assets/*.ttf
```
Expected: `file` reports "PNG image data" ×3 and "TrueType Font data" ×7.

- [ ] **Step 2: Convert ttf → woff2 with fonttools**

```bash
pip3 install --quiet brotli
for f in "$SCRATCH"/assets/*.ttf; do fonttools ttLib.woff2 compress -o "public/fonts/cooper-bt/$(basename "${f%.ttf}").woff2" "$f"; done
ls -la public/fonts/cooper-bt/
```
Expected: 7 `.woff2` files, each smaller than its `.ttf`.

- [ ] **Step 3: Record image dimensions for reference and commit**

```bash
sips -g pixelWidth -g pixelHeight public/images/*.png
git add public
git commit -m "Add brand assets: logos, duotone photo, Cooper BT woff2"
```

---

### Task 3: Tokens, fonts, layout and page furniture

**Files:**
- Create: `app/tokens.css`, `app/fonts.ts`, `components/Grain.tsx`, `components/Frame.tsx`, `components/furniture.module.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties from the guideline available globally; `--font-cooper` and `--font-special-elite` variables on `<html>`; `<Grain/>` and `<Frame/>` components with no props.

- [ ] **Step 1: Write `app/tokens.css`**

```css
/* unwoventhread — red rendition. Fonts are loaded by next/font (app/fonts.ts); see --font-* below. */
:root{
  /* ---- Colour: two brand values, everything else derived ---- */
  --red:#C31C1D;
  --cream:#EFE7DA;

  --red-deep:#9C1617;      /* hover / press */
  --red-soft:#D9605F;      /* rules, disabled ink, watermarks */
  --red-wash:#F6E3DF;      /* tints, selected rows */
  --cream-deep:#E2D8C8;    /* dividers, sunken paper */
  --cream-light:#F7F2EA;   /* card ground, one step above the page */
  --ink:#2A211C;           /* the only near-black; body copy at small sizes */
  --ink-muted:#7A6C61;     /* captions, labels (4.9:1 on cream) */
  --white:#FFFFFF;

  --surface-page:var(--cream);
  --surface-card:var(--cream-light);
  --surface-inverse:var(--red);
  --ink-heading:var(--red);
  --ink-body:var(--ink);
  --ink-caption:var(--ink-muted);
  --ink-on-red:var(--cream);
  --border-hairline:var(--cream-deep);
  --border-strong:var(--red);

  /* ---- Type ---- */
  --font-display:var(--font-special-elite),"Cooper BT",Georgia,serif;
  --font-core:var(--font-cooper),"Cooper BT",Georgia,serif;
  --weight-light:300;
  --weight-medium:500;
  --weight-bold:700;
  --weight-black:900;

  /* Golden-ratio scale, φ = 1.618, anchored on 16px body.
     10 ← 16 → 26 → 42 → 68 → 110 → 178 */
  --t-micro:10px;
  --t-body:16px;
  --t-sub:26px;
  --t-head:42px;
  --t-display:68px;
  --t-numeral:110px;
  --t-numeral-xl:178px;

  --tracking-label:0.14em;
  --tracking-wide:0.28em;
  --leading-tight:0.98;
  --leading-snug:1.18;
  --leading-normal:1.5;

  /* ---- Space: 4-based ---- */
  --space-4:4px; --space-8:8px; --space-12:12px; --space-16:16px;
  --space-24:24px; --space-32:32px; --space-48:48px; --space-64:64px; --space-96:96px;
  --page-frame:14px;
  --page-max:1120px;
  --measure-prose:60ch;

  /* ---- Line & radius ---- */
  --line-hairline:1px;
  --line-rule:1.5px;
  --radius-sm:2px;
  --radius-card:3px;
  --radius-pill:999px;

  /* ---- Depth ---- */
  --shadow-paper:0 18px 50px rgba(42,33,28,0.18), 0 2px 6px rgba(42,33,28,0.10);
  --shadow-lift:0 34px 80px rgba(42,33,28,0.26), 0 3px 8px rgba(42,33,28,0.12);
  --scrim:rgba(42,33,28,0.42);

  /* ---- Motion ---- */
  --dur-fast:140ms;
  --dur-base:260ms;
  --dur-slow:620ms;
  --ease:cubic-bezier(0.22,0.68,0.24,1);
}

html{-webkit-font-smoothing:antialiased}
body{margin:0;overflow-x:hidden;background:var(--cream);color:var(--ink-body);font:var(--weight-light) var(--t-body)/var(--leading-normal) var(--font-core)}
*,*::before,*::after{box-sizing:border-box}
a{color:var(--red);text-decoration-thickness:1px;text-underline-offset:3px}
a:hover{color:var(--red-deep)}
::selection{background:var(--red-wash)}
:focus-visible{outline:2px solid var(--red-soft);outline-offset:3px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:1ms!important}}
```

- [ ] **Step 2: Write `app/fonts.ts`**

```ts
import localFont from 'next/font/local'
import { Special_Elite } from 'next/font/google'

export const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-special-elite',
  display: 'swap',
})

export const cooper = localFont({
  variable: '--font-cooper',
  display: 'swap',
  src: [
    { path: '../public/fonts/cooper-bt/CooperLtBT-Regular.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-Italic.woff2', weight: '300', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperMdBT-Regular.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperMdBT-Italic.woff2', weight: '500', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-BoldItalic.woff2', weight: '700', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperBlkBT-Regular.woff2', weight: '900', style: 'normal' },
  ],
})
```

- [ ] **Step 3: Write the furniture components**

`components/furniture.module.css`:
```css
.grain{position:fixed;inset:0;z-index:35;pointer-events:none;opacity:.14;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")}
.frame{position:fixed;inset:0;z-index:30;pointer-events:none;border:var(--page-frame) solid var(--cream)}
```

`components/Grain.tsx`:
```tsx
import styles from './furniture.module.css'

export function Grain() {
  return <div className={styles.grain} aria-hidden="true" />
}
```

`components/Frame.tsx`:
```tsx
import styles from './furniture.module.css'

export function Frame() {
  return <div className={styles.frame} aria-hidden="true" />
}
```

- [ ] **Step 4: Write `app/layout.tsx`** (Nav is added in Task 11)

```tsx
import type { Metadata } from 'next'
import './tokens.css'
import { cooper, specialElite } from './fonts'
import { Grain } from '@/components/Grain'
import { Frame } from '@/components/Frame'

export const metadata: Metadata = {
  title: 'unwoventhread — loyalty card',
  description: 'curating conscious community',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cooper.variable} ${specialElite.variable}`}>
      <body>
        <Grain />
        <Frame />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Build and commit**

```bash
npm run build && npx tsc --noEmit
git add -A && git commit -m "Add brand tokens, fonts, and page furniture"
```

---

### Task 4: Cookie signing (`lib/cookies.ts`) + Vitest setup

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/cookies.ts`, `lib/cookies.test.ts`
- Modify: `package.json` (scripts, devDependencies)

**Interfaces:**
- Produces:
  - `CARD_COOKIE = 'ut_card'`, `STAFF_COOKIE = 'ut_staff'`
  - `sign(value: string, secret: string): string` → `"<value>.<base64url hmac>"`
  - `verify(token: string | null | undefined, secret: string): string | null`
  - `safeEqual(a: string, b: string): boolean`
  - `getSecret(): string` (throws if `CARD_COOKIE_SECRET` unset or < 16 chars)

- [ ] **Step 1: Install test tooling**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event dotenv
```

- [ ] **Step 2: Write `vitest.config.ts` and `vitest.setup.ts`; add `test` script**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

`vitest.setup.ts`:
```ts
import { config } from 'dotenv'
import '@testing-library/jest-dom/vitest'

config({ path: '.env.local' })
```

In `package.json` scripts add: `"test": "vitest run"`.

- [ ] **Step 3: Write the failing test `lib/cookies.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { sign, verify, safeEqual, getSecret } from './cookies'

const SECRET = 'test-secret-with-enough-length'

describe('sign/verify', () => {
  it('round-trips a value', () => {
    const token = sign('abc-123', SECRET)
    expect(token.startsWith('abc-123.')).toBe(true)
    expect(verify(token, SECRET)).toBe('abc-123')
  })
  it('rejects a tampered value', () => {
    const token = sign('abc-123', SECRET)
    expect(verify('abd-123.' + token.split('.')[1], SECRET)).toBeNull()
  })
  it('rejects a wrong secret', () => {
    expect(verify(sign('x', SECRET), SECRET + 'z')).toBeNull()
  })
  it('rejects missing or malformed tokens', () => {
    expect(verify(undefined, SECRET)).toBeNull()
    expect(verify(null, SECRET)).toBeNull()
    expect(verify('', SECRET)).toBeNull()
    expect(verify('no-dot', SECRET)).toBeNull()
    expect(verify('.sig-only', SECRET)).toBeNull()
  })
})

describe('safeEqual', () => {
  it('compares strings of equal and unequal length', () => {
    expect(safeEqual('1234', '1234')).toBe(true)
    expect(safeEqual('1234', '1235')).toBe(false)
    expect(safeEqual('1234', '123')).toBe(false)
  })
})

describe('getSecret', () => {
  it('throws when unset or short', () => {
    const prev = process.env.CARD_COOKIE_SECRET
    process.env.CARD_COOKIE_SECRET = 'short'
    expect(() => getSecret()).toThrow()
    delete process.env.CARD_COOKIE_SECRET
    expect(() => getSecret()).toThrow()
    process.env.CARD_COOKIE_SECRET = prev
  })
})
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- lib/cookies.test.ts`
Expected: FAIL — cannot resolve `./cookies`.

- [ ] **Step 5: Write `lib/cookies.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export const CARD_COOKIE = 'ut_card'
export const STAFF_COOKIE = 'ut_staff'

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Returns "<value>.<signature>". */
export function sign(value: string, secret: string): string {
  return `${value}.${hmac(value, secret)}`
}

/** Returns the signed value, or null if the token is missing, malformed, or tampered. */
export function verify(token: string | null | undefined, secret: string): string | null {
  if (!token) return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const value = token.slice(0, i)
  const sig = token.slice(i + 1)
  return safeEqual(sig, hmac(value, secret)) ? value : null
}

export function getSecret(): string {
  const s = process.env.CARD_COOKIE_SECRET
  if (!s || s.length < 16) throw new Error('CARD_COOKIE_SECRET must be set (16+ chars)')
  return s
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- lib/cookies.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "Add signed cookie helpers and Vitest setup"
```

---

### Task 5: Rate limiter (`lib/ratelimit.ts`)

**Files:**
- Create: `lib/ratelimit.ts`, `lib/ratelimit.test.ts`

**Interfaces:**
- Produces: `type RateLimiter = { check(key: string): boolean }`; `createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter`. `check` returns `true` when the call is allowed (and records it), `false` when over the limit.

- [ ] **Step 1: Write the failing test `lib/ratelimit.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './ratelimit'

describe('createRateLimiter', () => {
  it('allows up to limit then blocks', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })
  it('keys are independent', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
  })
  it('frees up after the window passes', () => {
    let t = 0
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    expect(rl.check('a')).toBe(true)
    t = 999
    expect(rl.check('a')).toBe(false)
    t = 1001
    expect(rl.check('a')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/ratelimit.test.ts` → FAIL, module not found.

- [ ] **Step 3: Write `lib/ratelimit.ts`**

```ts
export type RateLimiter = { check(key: string): boolean }

/** In-memory sliding-window limiter. Per-instance; good enough for a one-day event. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const now = opts.now ?? Date.now
  const hits = new Map<string, number[]>()
  return {
    check(key) {
      const t = now()
      const recent = (hits.get(key) ?? []).filter((x) => x > t - opts.windowMs)
      if (recent.length >= opts.limit) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.set(key, recent)
      return true
    },
  }
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

```bash
npm test -- lib/ratelimit.test.ts
git add -A && git commit -m "Add in-memory rate limiter"
```

---

### Task 6: Card issuance decision + `proxy.ts`

**Files:**
- Create: `lib/issue-card.ts`, `lib/issue-card.test.ts`, `proxy.ts`

**Interfaces:**
- Consumes: `sign`, `verify` (Task 4); `RateLimiter` (Task 5).
- Produces: `resolveCard(existingToken: string | undefined, secret: string, ip: string, limiter: RateLimiter): { cardId: string; token: string; minted: boolean } | { blocked: true }`. `proxy.ts` sets the `ut_card` cookie on `/` and forwards it on the same request.

- [ ] **Step 1: Write the failing test `lib/issue-card.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { resolveCard } from './issue-card'
import { sign, verify } from './cookies'
import { createRateLimiter } from './ratelimit'

const SECRET = 'test-secret-with-enough-length'
const UUID = '5d1f2a4e-9c3b-4a7e-8f1d-2b6c7e8f9a0b'
const always = { check: () => true }

describe('resolveCard', () => {
  it('keeps a valid existing card', () => {
    const token = sign(UUID, SECRET)
    expect(resolveCard(token, SECRET, '1.1.1.1', always)).toEqual({ cardId: UUID, token, minted: false })
  })
  it('mints a new signed uuid when missing', () => {
    const r = resolveCard(undefined, SECRET, '1.1.1.1', always)
    if ('blocked' in r) throw new Error('unexpected block')
    expect(r.minted).toBe(true)
    expect(r.cardId).toMatch(/^[0-9a-f-]{36}$/)
    expect(verify(r.token, SECRET)).toBe(r.cardId)
  })
  it('re-mints when the token is tampered or not a uuid', () => {
    const r1 = resolveCard('bad.token', SECRET, '1.1.1.1', always)
    expect('minted' in r1 && r1.minted).toBe(true)
    const r2 = resolveCard(sign('not-a-uuid', SECRET), SECRET, '1.1.1.1', always)
    expect('minted' in r2 && r2.minted).toBe(true)
  })
  it('blocks minting when the limiter says no, but never blocks existing cards', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect('minted' in resolveCard(undefined, SECRET, 'ip', rl)).toBe(true)
    expect(resolveCard(undefined, SECRET, 'ip', rl)).toEqual({ blocked: true })
    expect('minted' in resolveCard(sign(UUID, SECRET), SECRET, 'ip', rl)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- lib/issue-card.test.ts` → module not found.

- [ ] **Step 3: Write `lib/issue-card.ts`**

```ts
import { randomUUID } from 'node:crypto'
import { sign, verify } from './cookies'
import type { RateLimiter } from './ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CardResolution = { cardId: string; token: string; minted: boolean } | { blocked: true }

/** Decide which card id this request owns. Pure: no DB, no I/O. */
export function resolveCard(
  existingToken: string | undefined,
  secret: string,
  ip: string,
  limiter: RateLimiter,
): CardResolution {
  const existing = verify(existingToken, secret)
  if (existing && UUID_RE.test(existing)) return { cardId: existing, token: existingToken as string, minted: false }
  if (!limiter.check(ip)) return { blocked: true }
  const cardId = randomUUID()
  return { cardId, token: sign(cardId, secret), minted: true }
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- lib/issue-card.test.ts` → 4 PASS.

- [ ] **Step 5: Write `proxy.ts` at the repo root**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { CARD_COOKIE, getSecret } from '@/lib/cookies'
import { createRateLimiter } from '@/lib/ratelimit'
import { resolveCard } from '@/lib/issue-card'

// 5 new cards per IP per 10 minutes — stops a script inflating the attendee count.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const r = resolveCard(request.cookies.get(CARD_COOKIE)?.value, getSecret(), ip, limiter)
  if ('blocked' in r || !r.minted) return NextResponse.next()

  // Forward the new cookie on this same request so the page render already sees it.
  const headers = new Headers(request.headers)
  const prior = headers.get('cookie')
  headers.set('cookie', prior ? `${prior}; ${CARD_COOKIE}=${r.token}` : `${CARD_COOKIE}=${r.token}`)
  const res = NextResponse.next({ request: { headers } })
  res.cookies.set({
    name: CARD_COOKIE,
    value: r.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

export const config = { matcher: '/' }
```

- [ ] **Step 6: Create a local secret, build, and smoke-test the cookie**

```bash
grep -q CARD_COOKIE_SECRET .env.local 2>/dev/null || echo "CARD_COOKIE_SECRET=$(openssl rand -hex 24)" >> .env.local
npm run build && npx tsc --noEmit
(npm run start -- -p 3123 > /dev/null 2>&1 &) ; sleep 3
curl -sI http://localhost:3123/ | grep -i 'set-cookie: ut_card='
lsof -ti:3123 | xargs kill 2>/dev/null || true
```
Expected: a `set-cookie: ut_card=<uuid>.<sig>; Path=/; ... HttpOnly; SameSite=lax` line.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Mint signed card cookie in proxy"
```

---

### Task 7: Vercel link, Neon provisioning, Drizzle schema and seed

**Files:**
- Create: `lib/config.ts`, `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/seed.ts`, `drizzle.config.ts`
- Modify: `package.json` (scripts), `.env.local` (pulled)

**Interfaces:**
- Produces:
  - `EVENT` (slug/name/date/venue/rewardText/actions), `POLL_MS`, `STATS_POLL_MS`, `COPY`, `TICKER_WORDS` from `lib/config.ts`
  - Drizzle tables `events`, `actions`, `cards`, `stamps` from `lib/db/schema.ts`
  - `getDb()` from `lib/db/index.ts`
  - npm scripts `db:push`, `db:seed`

> **Needs the user** for `vercel login` and possibly the Neon claim step. Stop and ask when the CLI does.

- [ ] **Step 1: Install and link the Vercel CLI, then provision Neon via the Marketplace**

```bash
npm i -g vercel
vercel whoami || echo "ASK THE USER to run: ! vercel login"
vercel link --yes
vercel integration discover --category storage
vercel integration add neon --yes --no-claim
```
If `add` reports a browser step, run `vercel integration open neon` and ask the user to finish it, then continue.

- [ ] **Step 2: Add app secrets to Vercel and pull the env**

```bash
openssl rand -hex 24 | vercel env add CARD_COOKIE_SECRET production
openssl rand -hex 24 | vercel env add CARD_COOKIE_SECRET preview
openssl rand -hex 24 | vercel env add CARD_COOKIE_SECRET development
```
Ask the user for the staff PIN (4–8 digits) and add it the same way for all three environments as `STAFF_PIN`. Then:
```bash
vercel env pull .env.local --yes
grep -E '^(DATABASE_URL|CARD_COOKIE_SECRET|STAFF_PIN)=' .env.local | cut -d= -f1
```
Expected: the three names are printed (values never echoed).

- [ ] **Step 3: Install DB deps**

```bash
npm install drizzle-orm @neondatabase/serverless zod
npm install -D drizzle-kit tsx dotenv-cli
```

- [ ] **Step 4: Write `lib/config.ts`**

```ts
export const EVENT = {
  slug: 'pilot-market',
  name: 'Pilot Market',
  date: '2026-10-11', // YYYY-MM-DD; the card's month/day/weekday derive from this
  venue: 'Tiong Bahru CC',
  rewardText: 'Collect five and take home a matcha, on us.',
  actions: [
    { key: 'booth', label: 'Visit a booth', position: 1 },
    { key: 'photostrip', label: 'Take a photostrip', position: 2 },
    { key: 'follow', label: 'Follow @unwoventhread', position: 3 },
    { key: 'workshop', label: 'Join a workshop', position: 4 },
    { key: 'thrift', label: 'Thrift something', position: 5 },
  ],
} as const

export const POLL_MS = 4000
export const STATS_POLL_MS = 10000

export const COPY = {
  handle: '@unwoventhread',
  complete: 'All five. Show this at the counter for your matcha.',
  redeemed: 'Enjoyed — see you next time.',
  unavailable: 'Card unavailable — find a staff member.',
  accent: 'stitch with us',
} as const

export const TICKER_WORDS = ['thrift', 'workshop', 'cafe', 'music', 'people', 'curating conscious community'] as const
```

- [ ] **Step 5: Write `lib/db/schema.ts`**

```ts
import { pgTable, serial, text, date, uuid, integer, timestamp, primaryKey, unique } from 'drizzle-orm/pg-core'

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  date: date('date').notNull(),
  venue: text('venue').notNull(),
  rewardText: text('reward_text').notNull(),
})

export const actions = pgTable(
  'actions',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id').notNull().references(() => events.id),
    key: text('key').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [unique('actions_event_key').on(t.eventId, t.key)],
)

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: integer('event_id').notNull().references(() => events.id),
  number: serial('number').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
})

export const stamps = pgTable(
  'stamps',
  {
    cardId: uuid('card_id').notNull().references(() => cards.id),
    actionId: integer('action_id').notNull().references(() => actions.id),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
    awardedBy: text('awarded_by').notNull(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.actionId] })],
)
```

- [ ] **Step 6: Write `lib/db/index.ts` (lazy, no Proxy) and `drizzle.config.ts`**

`lib/db/index.ts`:
```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(neon(url), { schema })
}

let _db: ReturnType<typeof createDb> | null = null

export function getDb() {
  if (!_db) _db = createDb()
  return _db
}

export type Db = ReturnType<typeof getDb>
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 7: Write `lib/db/seed.ts`**

```ts
import { getDb } from './index'
import { events, actions } from './schema'
import { EVENT } from '../config'

async function main() {
  const db = getDb()
  const values = { slug: EVENT.slug, name: EVENT.name, date: EVENT.date, venue: EVENT.venue, rewardText: EVENT.rewardText }
  const [ev] = await db
    .insert(events)
    .values(values)
    .onConflictDoUpdate({ target: events.slug, set: values })
    .returning()
  for (const a of EVENT.actions) {
    await db
      .insert(actions)
      .values({ eventId: ev.id, key: a.key, label: a.label, position: a.position })
      .onConflictDoUpdate({ target: [actions.eventId, actions.key], set: { label: a.label, position: a.position } })
  }
  console.log(`seeded event "${ev.slug}" with ${EVENT.actions.length} actions`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 8: Add scripts, push schema, seed**

In `package.json` scripts add:
```json
"db:push": "dotenv -e .env.local -- drizzle-kit push",
"db:seed": "dotenv -e .env.local -- tsx lib/db/seed.ts"
```
Run:
```bash
npm run db:push
npm run db:seed
```
Expected: push creates 4 tables; seed prints `seeded event "pilot-market" with 5 actions`. Run seed twice to confirm it is idempotent (no error).

- [ ] **Step 9: Commit** (never commit `.env.local`)

```bash
npx tsc --noEmit
git status --short | grep -v '\.env' 
git add -A && git commit -m "Add Drizzle schema, lazy Neon client, event seed"
```

---

### Task 8: Date/reward helpers and card state queries

**Files:**
- Create: `lib/date.ts`, `lib/date.test.ts`, `lib/reward.ts`, `lib/reward.test.ts`, `lib/card-state.ts`, `lib/card-state.test.ts`

**Interfaces:**
- Consumes: `getDb`, schema tables (Task 7), `EVENT`, `COPY`.
- Produces:
  - `formatCardDate(iso: string): { month: string; day: string; weekday: string }`
  - `rewardCopy(collected: number, total: number, redeemedAt: string | null, rewardText: string): string`
  - `type Slot = { key: string; label: string; position: number }`
  - `type CardState = { id: string; number: number; name: string | null; event: { name: string; venue: string; date: string; rewardText: string }; slots: Slot[]; collected: string[]; redeemedAt: string | null }`
  - `ensureCard(cardId: string, eventSlug: string): Promise<void>`
  - `loadCardState(cardId: string): Promise<CardState | null>`
  - `updateCardName(cardId: string, name: string | null): Promise<void>`

- [ ] **Step 1: Write failing tests for the pure helpers**

`lib/date.test.ts`:
```ts
import { expect, it } from 'vitest'
import { formatCardDate } from './date'

it('formats an ISO date into month/day/weekday without timezone drift', () => {
  expect(formatCardDate('2025-10-11')).toEqual({ month: 'October', day: '11', weekday: 'Saturday' })
  expect(formatCardDate('2026-01-01')).toEqual({ month: 'January', day: '1', weekday: 'Thursday' })
})
```

`lib/reward.test.ts`:
```ts
import { expect, it } from 'vitest'
import { rewardCopy } from './reward'
import { COPY } from './config'

it('picks copy by progress and redemption', () => {
  expect(rewardCopy(2, 5, null, 'Collect five.')).toBe('Collect five.')
  expect(rewardCopy(5, 5, null, 'Collect five.')).toBe(COPY.complete)
  expect(rewardCopy(5, 5, '2026-10-11T05:00:00Z', 'Collect five.')).toBe(COPY.redeemed)
  expect(rewardCopy(3, 3, null, 'x')).toBe(COPY.complete)
})
```

- [ ] **Step 2: Run to verify they fail** — `npm test -- lib/date.test.ts lib/reward.test.ts`.

- [ ] **Step 3: Write `lib/date.ts` and `lib/reward.ts`**

`lib/date.ts`:
```ts
export function formatCardDate(iso: string): { month: string; day: string; weekday: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(dt)
  return { month: fmt({ month: 'long' }), day: String(d), weekday: fmt({ weekday: 'long' }) }
}
```

`lib/reward.ts`:
```ts
import { COPY } from './config'

export function rewardCopy(collected: number, total: number, redeemedAt: string | null, rewardText: string): string {
  if (redeemedAt) return COPY.redeemed
  if (total > 0 && collected >= total) return COPY.complete
  return rewardText
}
```

- [ ] **Step 4: Run to verify they pass.**

- [ ] **Step 5: Write the failing DB test `lib/card-state.test.ts`** (skips without `DATABASE_URL`; cleans up its own rows)

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { ensureCard, loadCardState, updateCardName } from './card-state'
import { getDb } from './db'
import { cards, stamps } from './db/schema'
import { EVENT } from './config'

const created: string[] = []
afterEach(async () => {
  const db = getDb()
  for (const id of created.splice(0)) {
    await db.delete(stamps).where(eq(stamps.cardId, id))
    await db.delete(cards).where(eq(cards.id, id))
  }
})

describe.skipIf(!process.env.DATABASE_URL)('card-state', () => {
  it('ensureCard is idempotent and loadCardState returns seeded slots', async () => {
    const id = randomUUID()
    created.push(id)
    await ensureCard(id, EVENT.slug)
    await ensureCard(id, EVENT.slug)
    const state = await loadCardState(id)
    expect(state?.id).toBe(id)
    expect(state?.number).toBeGreaterThan(0)
    expect(state?.name).toBeNull()
    expect(state?.event.name).toBe(EVENT.name)
    expect(state?.slots.map((s) => s.key)).toEqual(EVENT.actions.map((a) => a.key))
    expect(state?.collected).toEqual([])
    expect(state?.redeemedAt).toBeNull()
  })
  it('returns null for an unknown card', async () => {
    expect(await loadCardState(randomUUID())).toBeNull()
  })
  it('updateCardName sets and clears the name', async () => {
    const id = randomUUID()
    created.push(id)
    await ensureCard(id, EVENT.slug)
    await updateCardName(id, 'Jia Wen')
    expect((await loadCardState(id))?.name).toBe('Jia Wen')
    await updateCardName(id, null)
    expect((await loadCardState(id))?.name).toBeNull()
  })
})
```

- [ ] **Step 6: Run to verify it fails** — `npm test -- lib/card-state.test.ts` → module not found.

- [ ] **Step 7: Write `lib/card-state.ts`**

```ts
import { and, asc, eq } from 'drizzle-orm'
import { getDb } from './db'
import { actions, cards, events, stamps } from './db/schema'

export type Slot = { key: string; label: string; position: number }

export type CardState = {
  id: string
  number: number
  name: string | null
  event: { name: string; venue: string; date: string; rewardText: string }
  slots: Slot[]
  collected: string[]
  redeemedAt: string | null
}

/** Insert the card row for a proxy-minted id. Safe to call on every request. */
export async function ensureCard(cardId: string, eventSlug: string): Promise<void> {
  const db = getDb()
  const [ev] = await db.select({ id: events.id }).from(events).where(eq(events.slug, eventSlug))
  if (!ev) throw new Error(`event "${eventSlug}" is not seeded`)
  await db.insert(cards).values({ id: cardId, eventId: ev.id }).onConflictDoNothing({ target: cards.id })
}

export async function loadCardState(cardId: string): Promise<CardState | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cards.id,
      number: cards.number,
      name: cards.name,
      redeemedAt: cards.redeemedAt,
      eventId: events.id,
      eventName: events.name,
      venue: events.venue,
      date: events.date,
      rewardText: events.rewardText,
    })
    .from(cards)
    .innerJoin(events, eq(cards.eventId, events.id))
    .where(eq(cards.id, cardId))
  if (!row) return null

  const slots = await db
    .select({ key: actions.key, label: actions.label, position: actions.position })
    .from(actions)
    .where(eq(actions.eventId, row.eventId))
    .orderBy(asc(actions.position))

  const collectedRows = await db
    .select({ key: actions.key })
    .from(stamps)
    .innerJoin(actions, eq(stamps.actionId, actions.id))
    .where(and(eq(stamps.cardId, cardId), eq(actions.eventId, row.eventId)))

  return {
    id: row.id,
    number: row.number,
    name: row.name,
    event: { name: row.eventName, venue: row.venue, date: row.date, rewardText: row.rewardText },
    slots,
    collected: collectedRows.map((r) => r.key),
    redeemedAt: row.redeemedAt ? row.redeemedAt.toISOString() : null,
  }
}

export async function updateCardName(cardId: string, name: string | null): Promise<void> {
  await getDb().update(cards).set({ name }).where(eq(cards.id, cardId))
}
```

- [ ] **Step 8: Run to verify it passes** — `npm test -- lib/card-state.test.ts` → 3 PASS (or skipped if no `DATABASE_URL`; it must be present after Task 7).

- [ ] **Step 9: Commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "Add card state queries, date and reward helpers"
```

---

### Task 9: Staff operations (`lib/staff-ops.ts`) and staff session tokens

**Files:**
- Create: `lib/staff-ops.ts`, `lib/staff-ops.test.ts`, `lib/staff-session.ts`, `lib/staff-session.test.ts`

**Interfaces:**
- Consumes: `getDb`, schema, `ensureCard` (Task 8), `sign`/`verify` (Task 4).
- Produces:
  - `type CardSummary = { id: string; number: number; name: string | null; collected: number; total: number; redeemedAt: string | null }`
  - `type AwardResult = { status: 'awarded' | 'already'; card: CardSummary } | { status: 'not_found' }`
  - `type RedeemResult = { status: 'redeemed' | 'already_redeemed' | 'incomplete'; card: CardSummary } | { status: 'not_found' }`
  - `type EventStats = { cards: number; stamps: number; redeemed: number }`
  - `awardStamp(cardId, actionKey, awardedBy): Promise<AwardResult>`, `redeemCard(cardId): Promise<RedeemResult>`, `getEventStats(eventSlug): Promise<EventStats>`, `findCardIdByNumber(eventSlug, number): Promise<string | null>`
  - `makeStaffToken(secret: string, now?: number): string`, `readStaffToken(token: string | undefined, secret: string, now?: number): boolean`, `endOfDaySgtEpochSeconds(now: number): number`

- [ ] **Step 1: Write failing test `lib/staff-session.test.ts`**

```ts
import { expect, it } from 'vitest'
import { endOfDaySgtEpochSeconds, makeStaffToken, readStaffToken } from './staff-session'

const SECRET = 'test-secret-with-enough-length'

it('expires at midnight Singapore time', () => {
  // 2026-10-11T10:00:00+08:00 == 02:00Z
  const now = Date.UTC(2026, 9, 11, 2, 0, 0)
  // midnight 2026-10-12 SGT == 2026-10-11T16:00:00Z
  expect(endOfDaySgtEpochSeconds(now)).toBe(Date.UTC(2026, 9, 11, 16, 0, 0) / 1000)
})

it('token is valid until expiry and invalid after or when tampered', () => {
  const now = Date.UTC(2026, 9, 11, 2, 0, 0)
  const token = makeStaffToken(SECRET, now)
  expect(readStaffToken(token, SECRET, now)).toBe(true)
  expect(readStaffToken(token, SECRET, Date.UTC(2026, 9, 11, 17, 0, 0))).toBe(false)
  expect(readStaffToken(token + 'x', SECRET, now)).toBe(false)
  expect(readStaffToken(undefined, SECRET, now)).toBe(false)
})
```

- [ ] **Step 2: Run to verify it fails**, then write `lib/staff-session.ts`

```ts
import { sign, verify } from './cookies'

const SGT_OFFSET_MS = 8 * 3600 * 1000

export function endOfDaySgtEpochSeconds(now: number): number {
  const sgt = new Date(now + SGT_OFFSET_MS)
  const nextMidnightSgtAsUtc = Date.UTC(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate() + 1)
  return (nextMidnightSgtAsUtc - SGT_OFFSET_MS) / 1000
}

export function makeStaffToken(secret: string, now: number = Date.now()): string {
  return sign(`staff:${endOfDaySgtEpochSeconds(now)}`, secret)
}

export function readStaffToken(token: string | undefined, secret: string, now: number = Date.now()): boolean {
  const value = verify(token, secret)
  if (!value || !value.startsWith('staff:')) return false
  const exp = Number(value.slice('staff:'.length))
  return Number.isFinite(exp) && exp * 1000 > now
}
```
Run: `npm test -- lib/staff-session.test.ts` → PASS.

- [ ] **Step 3: Write failing DB test `lib/staff-ops.test.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { awardStamp, redeemCard, getEventStats, findCardIdByNumber } from './staff-ops'
import { ensureCard, loadCardState } from './card-state'
import { getDb } from './db'
import { cards, stamps } from './db/schema'
import { EVENT } from './config'

const created: string[] = []
afterEach(async () => {
  const db = getDb()
  for (const id of created.splice(0)) {
    await db.delete(stamps).where(eq(stamps.cardId, id))
    await db.delete(cards).where(eq(cards.id, id))
  }
})

async function freshCard() {
  const id = randomUUID()
  created.push(id)
  await ensureCard(id, EVENT.slug)
  return id
}

describe.skipIf(!process.env.DATABASE_URL)('staff-ops', () => {
  it('awards once, then reports already', async () => {
    const id = await freshCard()
    const a = await awardStamp(id, 'booth', 'Booth')
    expect(a.status).toBe('awarded')
    if (a.status !== 'awarded') return
    expect(a.card.collected).toBe(1)
    expect(a.card.total).toBe(EVENT.actions.length)
    const b = await awardStamp(id, 'booth', 'Booth')
    expect(b.status).toBe('already')
    expect((await loadCardState(id))?.collected).toEqual(['booth'])
  })
  it('returns not_found for unknown card or action', async () => {
    expect((await awardStamp(randomUUID(), 'booth', 'Booth')).status).toBe('not_found')
    const id = await freshCard()
    expect((await awardStamp(id, 'nope', 'Booth')).status).toBe('not_found')
  })
  it('redeem refuses incomplete, succeeds at full, refuses twice', async () => {
    const id = await freshCard()
    expect((await redeemCard(id)).status).toBe('incomplete')
    for (const a of EVENT.actions) await awardStamp(id, a.key, 'test')
    expect((await redeemCard(id)).status).toBe('redeemed')
    expect((await redeemCard(id)).status).toBe('already_redeemed')
    expect((await loadCardState(id))?.redeemedAt).not.toBeNull()
  })
  it('stats count cards, stamps and redemptions; lookup by number works', async () => {
    const before = await getEventStats(EVENT.slug)
    const id = await freshCard()
    await awardStamp(id, 'booth', 'Booth')
    const after = await getEventStats(EVENT.slug)
    expect(after.cards).toBe(before.cards + 1)
    expect(after.stamps).toBe(before.stamps + 1)
    const number = (await loadCardState(id))!.number
    expect(await findCardIdByNumber(EVENT.slug, number)).toBe(id)
    expect(await findCardIdByNumber(EVENT.slug, 999999999)).toBeNull()
  })
})
```

- [ ] **Step 4: Run to verify it fails**, then write `lib/staff-ops.ts`

```ts
import { and, count, eq, isNotNull } from 'drizzle-orm'
import { getDb } from './db'
import { actions, cards, events, stamps } from './db/schema'

export type CardSummary = {
  id: string
  number: number
  name: string | null
  collected: number
  total: number
  redeemedAt: string | null
}
export type AwardResult = { status: 'awarded' | 'already'; card: CardSummary } | { status: 'not_found' }
export type RedeemResult =
  | { status: 'redeemed' | 'already_redeemed' | 'incomplete'; card: CardSummary }
  | { status: 'not_found' }
export type EventStats = { cards: number; stamps: number; redeemed: number }

async function summary(cardId: string): Promise<CardSummary | null> {
  const db = getDb()
  const [row] = await db
    .select({ id: cards.id, number: cards.number, name: cards.name, redeemedAt: cards.redeemedAt, eventId: cards.eventId })
    .from(cards)
    .where(eq(cards.id, cardId))
  if (!row) return null
  const [{ total }] = await db.select({ total: count() }).from(actions).where(eq(actions.eventId, row.eventId))
  const [{ collected }] = await db.select({ collected: count() }).from(stamps).where(eq(stamps.cardId, cardId))
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    collected,
    total,
    redeemedAt: row.redeemedAt ? row.redeemedAt.toISOString() : null,
  }
}

export async function awardStamp(cardId: string, actionKey: string, awardedBy: string): Promise<AwardResult> {
  const db = getDb()
  const [card] = await db.select({ eventId: cards.eventId }).from(cards).where(eq(cards.id, cardId))
  if (!card) return { status: 'not_found' }
  const [action] = await db
    .select({ id: actions.id })
    .from(actions)
    .where(and(eq(actions.eventId, card.eventId), eq(actions.key, actionKey)))
  if (!action) return { status: 'not_found' }
  const inserted = await db
    .insert(stamps)
    .values({ cardId, actionId: action.id, awardedBy })
    .onConflictDoNothing()
    .returning({ cardId: stamps.cardId })
  const s = (await summary(cardId)) as CardSummary
  return { status: inserted.length ? 'awarded' : 'already', card: s }
}

export async function redeemCard(cardId: string): Promise<RedeemResult> {
  const s = await summary(cardId)
  if (!s) return { status: 'not_found' }
  if (s.redeemedAt) return { status: 'already_redeemed', card: s }
  if (s.collected < s.total) return { status: 'incomplete', card: s }
  const now = new Date()
  await getDb().update(cards).set({ redeemedAt: now }).where(eq(cards.id, cardId))
  return { status: 'redeemed', card: { ...s, redeemedAt: now.toISOString() } }
}

export async function getEventStats(eventSlug: string): Promise<EventStats> {
  const db = getDb()
  const [ev] = await db.select({ id: events.id }).from(events).where(eq(events.slug, eventSlug))
  if (!ev) return { cards: 0, stamps: 0, redeemed: 0 }
  const [{ cardsN }] = await db.select({ cardsN: count() }).from(cards).where(eq(cards.eventId, ev.id))
  const [{ stampsN }] = await db
    .select({ stampsN: count() })
    .from(stamps)
    .innerJoin(cards, eq(stamps.cardId, cards.id))
    .where(eq(cards.eventId, ev.id))
  const [{ redeemedN }] = await db
    .select({ redeemedN: count() })
    .from(cards)
    .where(and(eq(cards.eventId, ev.id), isNotNull(cards.redeemedAt)))
  return { cards: cardsN, stamps: stampsN, redeemed: redeemedN }
}

export async function findCardIdByNumber(eventSlug: string, number: number): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(events, eq(cards.eventId, events.id))
    .where(and(eq(events.slug, eventSlug), eq(cards.number, number)))
  return row?.id ?? null
}
```

- [ ] **Step 5: Run to verify it passes** — `npm test -- lib/staff-ops.test.ts` → 4 PASS.

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npm test
git add -A && git commit -m "Add staff operations: award, redeem, stats, lookup, session token"
```

---

### Task 10: Server actions

**Files:**
- Create: `app/actions/card.ts`, `app/actions/staff.ts`, `lib/qr.ts`

**Interfaces:**
- Consumes: everything from Tasks 4, 8, 9; `EVENT` from config.
- Produces (all `'use server'`):
  - `getCardState(): Promise<CardState | null>`
  - `setName(name: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `type LoginState = { error: string | null }`; `login(prev: LoginState, formData: FormData): Promise<LoginState>` (redirects to `/staff` on success)
  - `staffAward(cardId: string, actionKey: string): Promise<AwardResult | { status: 'unauthorized' | 'invalid' | 'error' }>`
  - `staffRedeem(cardId: string): Promise<RedeemResult | { status: 'unauthorized' | 'invalid' | 'error' }>`
  - `staffStats(): Promise<EventStats | null>` (null when unauthorized)
  - `staffLookup(number: number): Promise<{ cardId: string | null } | { status: 'unauthorized' }>`
  - `renderQrSvg(value: string): Promise<string>` (not a server action; plain server-side helper)

- [ ] **Step 1: Install `qrcode`**

```bash
npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Write `lib/qr.ts`**

```ts
import QRCode from 'qrcode'

/** Red-on-transparent SVG markup for the card id. Rendered server-side only. */
export async function renderQrSvg(value: string): Promise<string> {
  return QRCode.toString(value, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#C31C1D', light: '#00000000' },
  })
}
```

- [ ] **Step 3: Write `app/actions/card.ts`**

```ts
'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { CARD_COOKIE, getSecret, verify } from '@/lib/cookies'
import { loadCardState, updateCardName, type CardState } from '@/lib/card-state'

async function currentCardId(): Promise<string | null> {
  const store = await cookies()
  return verify(store.get(CARD_COOKIE)?.value, getSecret())
}

export async function getCardState(): Promise<CardState | null> {
  const id = await currentCardId()
  if (!id) return null
  try {
    return await loadCardState(id)
  } catch (e) {
    console.error('getCardState failed', e)
    return null
  }
}

const NameSchema = z.string().trim().max(40)

export async function setName(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = await currentCardId()
  if (!id) return { ok: false, error: 'no card' }
  const parsed = NameSchema.safeParse(name)
  if (!parsed.success) return { ok: false, error: 'Keep it under 40 characters' }
  try {
    await updateCardName(id, parsed.data === '' ? null : parsed.data)
    return { ok: true }
  } catch (e) {
    console.error('setName failed', e)
    return { ok: false, error: 'Could not save right now' }
  }
}
```

- [ ] **Step 4: Write `app/actions/staff.ts`**

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { STAFF_COOKIE, getSecret, safeEqual } from '@/lib/cookies'
import { makeStaffToken, readStaffToken } from '@/lib/staff-session'
import { awardStamp, redeemCard, getEventStats, findCardIdByNumber, type AwardResult, type RedeemResult, type EventStats } from '@/lib/staff-ops'
import { EVENT } from '@/lib/config'

export type LoginState = { error: string | null }

const Uuid = z.string().uuid()
const ActionKey = z.enum(EVENT.actions.map((a) => a.key) as [string, ...string[]])

async function isStaff(): Promise<boolean> {
  const store = await cookies()
  return readStaffToken(store.get(STAFF_COOKIE)?.value, getSecret())
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '')
  const expected = process.env.STAFF_PIN
  if (!expected) return { error: 'Staff access is not configured' }
  if (!safeEqual(pin, expected)) return { error: 'Wrong PIN' }
  const store = await cookies()
  store.set({
    name: STAFF_COOKIE,
    value: makeStaffToken(getSecret()),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/staff',
  })
  redirect('/staff')
}

export type StaffFailure = { status: 'unauthorized' | 'invalid' | 'error' }

export async function staffAward(cardId: string, actionKey: string): Promise<AwardResult | StaffFailure> {
  if (!(await isStaff())) return { status: 'unauthorized' }
  const id = Uuid.safeParse(cardId)
  const key = ActionKey.safeParse(actionKey)
  if (!id.success || !key.success) return { status: 'invalid' }
  const label = EVENT.actions.find((a) => a.key === key.data)?.label ?? key.data
  try {
    return await awardStamp(id.data, key.data, label)
  } catch (e) {
    console.error('staffAward failed', e)
    return { status: 'error' }
  }
}

export async function staffRedeem(cardId: string): Promise<RedeemResult | StaffFailure> {
  if (!(await isStaff())) return { status: 'unauthorized' }
  const id = Uuid.safeParse(cardId)
  if (!id.success) return { status: 'invalid' }
  try {
    return await redeemCard(id.data)
  } catch (e) {
    console.error('staffRedeem failed', e)
    return { status: 'error' }
  }
}

export async function staffStats(): Promise<EventStats | null> {
  if (!(await isStaff())) return null
  try {
    return await getEventStats(EVENT.slug)
  } catch (e) {
    console.error('staffStats failed', e)
    return null
  }
}

export async function staffLookup(number: number): Promise<{ cardId: string | null } | { status: 'unauthorized' }> {
  if (!(await isStaff())) return { status: 'unauthorized' }
  const n = z.number().int().positive().safeParse(number)
  if (!n.success) return { cardId: null }
  try {
    return { cardId: await findCardIdByNumber(EVENT.slug, n.data) }
  } catch (e) {
    console.error('staffLookup failed', e)
    return { cardId: null }
  }
}
```

- [ ] **Step 5: Type-check, build, commit**

```bash
npx tsc --noEmit && npm run build
git add -A && git commit -m "Add card and staff server actions, QR renderer"
```

---

### Task 11: Static UI components (PillButton, Nav, Ticker, AfterSection, Footer)

**Files:**
- Create: `components/PillButton.tsx`, `components/PillButton.module.css`, `components/Nav.tsx`, `components/Nav.module.css`, `components/Ticker.tsx`, `components/Ticker.module.css`, `components/AfterSection.tsx`, `components/AfterSection.module.css`, `components/Footer.tsx`, `components/Footer.module.css`, `components/Ticker.test.tsx`, `components/PillButton.test.tsx`
- Modify: `app/layout.tsx` (add `<Nav />`)

**Interfaces:**
- Produces: `PillButton({ label, hoverLabel?, variant?: 'pill' | 'cta', href?, onClick?, className? })`, `Nav()`, `Ticker({ words })`, `AfterSection()`, `Footer()`.

- [ ] **Step 1: Write failing component tests**

`components/PillButton.test.tsx`:
```tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PillButton } from './PillButton'

it('renders the label twice (visible + swap copy) as a button by default', () => {
  render(<PillButton label="Menu" hoverLabel="Close" />)
  const btn = screen.getByRole('button', { name: 'Menu' })
  expect(btn).toBeInTheDocument()
  expect(btn.querySelectorAll('span')).toHaveLength(2)
})

it('renders an anchor when href is given', () => {
  render(<PillButton label="Collect a stamp" variant="cta" href="#card" />)
  expect(screen.getByRole('link', { name: 'Collect a stamp' })).toHaveAttribute('href', '#card')
})
```

`components/Ticker.test.tsx`:
```tsx
/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Ticker } from './Ticker'

it('repeats the word list four times for a seamless -50% loop', () => {
  const { container } = render(<Ticker words={['a', 'b']} />)
  const text = container.textContent ?? ''
  expect(text.split('a').length - 1).toBe(4)
  expect(text.split('b').length - 1).toBe(4)
})
```

- [ ] **Step 2: Run to verify they fail** — `npm test -- components`.

- [ ] **Step 3: Write `PillButton`**

`components/PillButton.module.css`:
```css
.pill{position:relative;overflow:hidden;height:34px;padding:0 20px;border-radius:var(--radius-pill);background:var(--cream);border:1px solid var(--red);color:var(--red);font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;cursor:pointer;display:grid;place-items:center;text-decoration:none}
.pill span{display:block;transition:transform var(--dur-base) var(--ease)}
.pill span+span{position:absolute;left:0;right:0;top:0;height:100%;display:grid;place-items:center;transform:translateY(100%)}
.pill:hover span{transform:translateY(-100%)}
.pill:hover span+span{transform:translateY(0)}

.cta{display:inline-flex;align-items:center;overflow:hidden;height:48px;padding:0 28px;border-radius:var(--radius-pill);background:var(--red);border:var(--line-rule) solid var(--red);color:var(--cream);font:var(--weight-medium) var(--t-body) var(--font-core);cursor:pointer;position:relative;text-decoration:none}
.cta span{transition:transform var(--dur-base) var(--ease)}
.cta span+span{position:absolute;left:28px;top:0;height:100%;display:flex;align-items:center;transform:translateY(100%)}
.cta:hover{background:var(--red-deep);color:var(--cream)}
.cta:hover span{transform:translateY(-100%)}
.cta:hover span+span{transform:translateY(0)}
```

`components/PillButton.tsx`:
```tsx
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
```

- [ ] **Step 4: Write `Nav`**

`components/Nav.module.css`:
```css
.nav{position:fixed;top:calc(var(--page-frame) + 14px);left:calc(var(--page-frame) + 14px);z-index:40;display:flex;gap:10px;align-items:center;animation:rise var(--dur-slow) var(--ease) both}
.markpill{position:fixed;top:calc(var(--page-frame) + 14px);right:calc(var(--page-frame) + 14px);z-index:40;height:34px;padding:0 18px;border-radius:var(--radius-pill);background:var(--cream);display:grid;place-items:center;animation:rise var(--dur-slow) var(--ease) .10s both}
.mark{height:15px;width:auto;display:block}
@keyframes rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
```

`components/Nav.tsx`:
```tsx
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
```

- [ ] **Step 5: Write `Ticker`**

`components/Ticker.module.css`:
```css
.ticker{border-top:1px solid var(--cream-deep);border-bottom:1px solid var(--cream-deep);overflow:hidden;padding:14px 0;background:var(--cream)}
.track{display:flex;gap:44px;width:max-content;animation:slide 38s linear infinite;font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--red)}
@keyframes slide{to{transform:translateX(-50%)}}
```

`components/Ticker.tsx`:
```tsx
import { Fragment } from 'react'
import styles from './Ticker.module.css'

/** Four copies of the word list; the track scrolls -50% so the loop is seamless. */
export function Ticker({ words }: { words: readonly string[] }) {
  const seq = Array.from({ length: 4 }, () => words).flat()
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.track}>
        {seq.map((w, i) => (
          <Fragment key={i}>
            <span>{w}</span>
            <span>&bull;</span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `AfterSection`**

`components/AfterSection.module.css`:
```css
.after{max-width:var(--page-max);margin:0 auto;padding:var(--space-96) var(--space-32)}
.lede{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:var(--space-64);align-items:start}
.num{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted)}
.h2{font:var(--weight-light) var(--t-head)/var(--leading-snug) var(--font-core);color:var(--red);margin:8px 0 0;text-transform:lowercase}
.accent{font:italic var(--weight-medium) var(--t-sub)/1 var(--font-core);vertical-align:.5em;margin-left:10px}
.after p{max-width:var(--measure-prose);margin:0 0 var(--space-16)}
.cta{margin-top:var(--space-32)}
.steps{border-top:1px solid var(--border-hairline);margin-top:var(--space-32)}
.step{display:grid;grid-template-columns:44px 1fr;gap:var(--space-24);padding:var(--space-24) 0;border-bottom:1px solid var(--border-hairline)}
.step h3{font:var(--weight-medium) var(--t-sub)/1.2 var(--font-core);color:var(--ink);margin:0 0 6px}
.step p{margin:0;color:var(--ink-muted)}
@media (max-width:720px){.lede{grid-template-columns:1fr;gap:var(--space-32)}}
```

`components/AfterSection.tsx`:
```tsx
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
```

- [ ] **Step 7: Write `Footer`**

`components/Footer.module.css`:
```css
.footer{border-top:1px solid var(--cream-deep);padding:var(--space-48) var(--space-32) calc(var(--page-frame) + var(--space-48))}
.inner{max-width:var(--page-max);margin:0 auto;display:flex;justify-content:space-between;align-items:flex-end;gap:var(--space-32);flex-wrap:wrap}
.logo{height:64px;width:auto}
.links{display:flex;gap:var(--space-24);font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;flex-wrap:wrap}
.links a{text-decoration:none}
.links a:hover{text-decoration:underline}
```

`components/Footer.tsx`:
```tsx
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
```

- [ ] **Step 8: Add `<Nav />` to `app/layout.tsx`** — import `Nav` from `@/components/Nav` and render it right after `<Frame />`.

- [ ] **Step 9: Run tests, build, commit**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A && git commit -m "Add pill button, nav, ticker, prose section, footer"
```

---

### Task 12: StampCard and NameField

**Files:**
- Create: `components/StampCard.tsx`, `components/StampCard.module.css`, `components/StampCard.test.tsx`, `components/NameField.tsx`

**Interfaces:**
- Consumes: `Slot` type (Task 8), `setName` action (Task 10).
- Produces:
  - `type StampCardProps = { month: string; day: string; weekday: string; meta: { label: string; value: string }[]; slots: { key: string; label: string }[]; collected: string[]; reward: string; qrSvg?: string | null; children?: React.ReactNode; cardRef?: React.Ref<HTMLElement> }`
  - `StampCard(props)` — presentational, no state
  - `NameField({ initial }: { initial: string | null })` — client component

- [ ] **Step 1: Write failing test `components/StampCard.test.tsx`**

```tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { StampCard } from './StampCard'

const base = {
  month: 'October',
  day: '11',
  weekday: 'Saturday',
  meta: [{ label: 'Member', value: 'Jia Wen' }, { label: 'Event', value: 'Pilot Market' }],
  slots: [
    { key: 'a', label: 'Visit a booth' },
    { key: 'b', label: 'Take a photostrip' },
    { key: 'c', label: 'Follow' },
  ],
  collected: ['a'],
  reward: 'Collect three.',
}

it('renders one slot per action with collected state', () => {
  render(<StampCard {...base} />)
  const slots = screen.getAllByRole('img', { name: /Stamp \d of 3/ })
  expect(slots).toHaveLength(3)
  expect(slots[0]).toHaveAttribute('aria-label', 'Stamp 1 of 3, Visit a booth: collected')
  expect(slots[0]).toHaveAttribute('data-on')
  expect(slots[1]).toHaveAttribute('aria-label', 'Stamp 2 of 3, Take a photostrip: not yet')
  expect(slots[1]).not.toHaveAttribute('data-on')
})

it('renders date, meta and reward copy', () => {
  render(<StampCard {...base} />)
  expect(screen.getByText('October')).toBeInTheDocument()
  expect(screen.getByText('11')).toBeInTheDocument()
  expect(screen.getByText('Saturday')).toBeInTheDocument()
  expect(screen.getByText('Jia Wen')).toBeInTheDocument()
  expect(screen.getByText('Collect three.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Write `components/StampCard.module.css`** (card rules copied from the reference; slots are spans, plus a QR/name row)

```css
.card{position:relative;z-index:10;height:min(700px,72svh);aspect-ratio:3/4;max-width:86vw;background:var(--cream-light);
  padding:0 clamp(20px,3.4vh,38px) clamp(16px,2.6vh,26px);display:flex;flex-direction:column;align-items:center;
  transform-origin:50% 74%;will-change:transform;container-type:size;
  -webkit-mask:radial-gradient(circle 5px at 50% 0,#0000 98%,#000) 0 0/17px 17px repeat-x,linear-gradient(#000,#000) 0 17px/100% calc(100% - 17px) no-repeat;
  mask:radial-gradient(circle 5px at 50% 0,#0000 98%,#000) 0 0/17px 17px repeat-x,linear-gradient(#000,#000) 0 17px/100% calc(100% - 17px) no-repeat}
.stub{height:22px;flex:0 0 auto}
.dots{width:100%;height:0;border-top:1px dashed var(--cream-deep);margin-bottom:2.2cqh}
.month{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--red)}
.day{font:var(--weight-black) clamp(110px,30cqh,178px)/var(--leading-tight) var(--font-core);color:var(--red);margin:.4cqh 0 0;letter-spacing:-.03em}
.weekday{font:italic var(--weight-light) var(--t-body)/1 var(--font-core);color:var(--ink-muted);margin-bottom:2.4cqh}
.rule{width:100%;height:1px;background:var(--border-hairline)}
.micro{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:3px 18px;padding:1.8cqh 0;font:var(--t-micro)/1.7 var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted)}
.micro b{font-weight:400;color:var(--ink)}
.slots{display:flex;gap:var(--space-12);margin:auto 0 1.6cqh}
.slot{width:44px;height:44px;border-radius:50%;border:var(--line-rule) solid var(--red);background:none;display:grid;place-items:center;position:relative;overflow:hidden}
.slot i{position:absolute;inset:0;background:var(--red);border-radius:50%;transform:scale(0);transition:transform var(--dur-base) var(--ease)}
.slot em{position:relative;font:italic var(--weight-light) var(--t-body)/1 var(--font-core);color:var(--red);transition:color var(--dur-base) var(--ease)}
.slot[data-on] i{transform:scale(1)}
.slot[data-on] em{color:var(--cream)}
.reward{font:italic var(--weight-light) var(--t-body)/1.35 var(--font-core);color:var(--ink);text-align:center;margin:0;max-width:30ch}
.tail{width:100%;display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-16);margin-top:1.6cqh}
.qr{width:clamp(56px,11cqh,80px);flex:0 0 auto}
.qr svg{display:block;width:100%;height:auto}
@media (max-width:480px){.slots{gap:var(--space-8)}.slot{width:38px;height:38px}}
```

- [ ] **Step 4: Write `components/StampCard.tsx`**

```tsx
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
```

- [ ] **Step 5: Run to verify it passes** — `npm test -- components/StampCard.test.tsx` → 2 PASS.

- [ ] **Step 6: Write `components/NameField.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { setName } from '@/app/actions/card'
import styles from './NameField.module.css'

export function NameField({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    if (value === (initial ?? '') && status !== 'error') return
    setStatus('saving')
    const r = await setName(value)
    setStatus(r.ok ? 'saved' : 'error')
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>Your name</span>
      <input
        className={styles.input}
        value={value}
        maxLength={40}
        placeholder="optional"
        onChange={(e) => {
          setValue(e.target.value)
          setStatus('idle')
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <span className={styles.status} aria-live="polite">
        {status === 'saving' ? 'saving' : status === 'saved' ? 'saved' : status === 'error' ? 'try again' : ''}
      </span>
    </label>
  )
}
```

`components/NameField.module.css`:
```css
.field{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-width:0}
.label{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted)}
.input{font:var(--weight-light) var(--t-body)/1.2 var(--font-core);color:var(--ink);background:var(--white);border:1px solid var(--border-hairline);border-radius:var(--radius-sm);padding:8px 10px;min-height:44px;width:100%}
.input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px var(--red-wash)}
.status{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted);min-height:12px}
```

- [ ] **Step 7: Type-check and commit**

```bash
npm test && npx tsc --noEmit
git add -A && git commit -m "Add StampCard and NameField"
```

---

### Task 13: Hero with scroll motion, polling hook, and the attendee page

**Files:**
- Create: `components/use-card-state.ts`, `components/Hero.tsx`, `components/Hero.module.css`
- Modify: `app/page.tsx`, create `app/page.module.css`

**Interfaces:**
- Consumes: `StampCard`, `NameField` (Task 12), `getCardState` (Task 10), `CardState` (Task 8), `ensureCard`, `loadCardState`, `formatCardDate`, `rewardCopy`, `renderQrSvg`, `EVENT`, `COPY`, `POLL_MS`, `TICKER_WORDS`, `Ticker`, `AfterSection`, `Footer`.
- Produces: `useCardState(initial: CardState | null): CardState | null`; `Hero({ initial, qrSvg })`; the `/` page.

- [ ] **Step 1: Write `components/use-card-state.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'
import { getCardState } from '@/app/actions/card'
import { POLL_MS } from '@/lib/config'
import type { CardState } from '@/lib/card-state'

/** Re-fetches the card while the tab is visible so staff-awarded stamps appear within POLL_MS. */
export function useCardState(initial: CardState | null): CardState | null {
  const [state, setState] = useState(initial)
  useEffect(() => {
    if (!initial) return
    let cancelled = false
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      const next = await getCardState()
      if (!cancelled && next) setState(next)
    }
    const timer = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [initial])
  return state
}
```

- [ ] **Step 2: Write `components/Hero.module.css`** (stage/ground/oval/cardwrap from the reference)

```css
.stage{position:relative;height:100svh;overflow:clip;display:grid;place-items:center;padding:calc(var(--page-frame) + 88px) var(--space-32) calc(var(--page-frame) + 76px)}
.ground{position:absolute;inset:-10% 0;will-change:transform;animation:fade 1.1s var(--ease) both}
.ground img{object-fit:cover}
.ground::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 40%,transparent 40%,rgba(42,33,28,.28))}
.oval{position:absolute;z-index:12;right:max(6vw,26px);top:calc(50% - 130px);rotate:-9deg;display:grid;place-items:center;padding:14px 26px;border:1.5px solid var(--cream);border-radius:50%/50%;color:var(--cream);font:italic var(--weight-medium) var(--t-body)/1 var(--font-core);white-space:nowrap;animation:fade var(--dur-slow) var(--ease) .52s both}
.cardwrap{position:relative;z-index:10;filter:drop-shadow(0 18px 50px rgba(42,33,28,.24)) drop-shadow(0 2px 5px rgba(42,33,28,.12));transition:filter var(--dur-slow) var(--ease);animation:rise var(--dur-slow) var(--ease) .18s both}
.cardwrap[data-lift]{filter:drop-shadow(0 36px 84px rgba(42,33,28,.30)) drop-shadow(0 3px 8px rgba(42,33,28,.14))}
@keyframes rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@media (max-width:720px){.oval{right:auto;left:max(4vw,18px);top:calc(var(--page-frame) + 64px)}}
```

- [ ] **Step 3: Write `components/Hero.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import photo from '@/public/images/photo-fabric-rolls.png'
import { StampCard } from './StampCard'
import { NameField } from './NameField'
import { useCardState } from './use-card-state'
import { formatCardDate } from '@/lib/date'
import { rewardCopy } from '@/lib/reward'
import { COPY, EVENT } from '@/lib/config'
import type { CardState } from '@/lib/card-state'
import styles from './Hero.module.css'

type Props = { initial: CardState | null; qrSvg: string | null }

export function Hero({ initial, qrSvg }: Props) {
  const state = useCardState(initial)
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
      card.style.transform = `rotate(${(-8 + 8 * e).toFixed(2)}deg) translateY(${(6 - 10 * e).toFixed(2)}%) scale(${(0.94 + 0.06 * e).toFixed(3)})`
      wrap.toggleAttribute('data-lift', e > 0.75)
      ground.style.transform = `translateY(${((p - 0.5) * -0.15 * r.height).toFixed(1)}px)`
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
  const reward = state
    ? rewardCopy(state.collected.length, state.slots.length, state.redeemedAt, state.event.rewardText)
    : EVENT.rewardText

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
          reward={reward}
          qrSvg={qrSvg}
        >
          {state && <NameField initial={state.name} />}
        </StampCard>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Write `app/page.module.css` and `app/page.tsx`**

`app/page.module.css`:
```css
.overline{margin:0;padding:18px var(--space-32);background:var(--cream);display:flex;gap:14px;align-items:baseline;justify-content:center;color:var(--red);font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-wide);text-transform:uppercase}
.overline b{font-weight:400;opacity:.6}
```

`app/page.tsx`:
```tsx
import { cookies } from 'next/headers'
import { CARD_COOKIE, getSecret, verify } from '@/lib/cookies'
import { ensureCard, loadCardState, type CardState } from '@/lib/card-state'
import { renderQrSvg } from '@/lib/qr'
import { EVENT, TICKER_WORDS } from '@/lib/config'
import { Hero } from '@/components/Hero'
import { Ticker } from '@/components/Ticker'
import { AfterSection } from '@/components/AfterSection'
import { Footer } from '@/components/Footer'
import styles from './page.module.css'

export default async function Page() {
  const store = await cookies()
  const cardId = verify(store.get(CARD_COOKIE)?.value, getSecret())

  let state: CardState | null = null
  if (cardId) {
    try {
      await ensureCard(cardId, EVENT.slug)
      state = await loadCardState(cardId)
    } catch (e) {
      // The page still renders; the card shows "unavailable" copy.
      console.error('card load failed', e)
    }
  }
  const qrSvg = state ? await renderQrSvg(state.id) : null

  return (
    <>
      <Hero initial={state} qrSvg={qrSvg} />
      <p className={styles.overline}>
        <b>01</b> Your card <b>·</b> {EVENT.name}
      </p>
      <Ticker words={TICKER_WORDS} />
      <AfterSection />
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Run it and check the card issues and renders**

```bash
npx tsc --noEmit && npm run build
npm run dev -- -p 3000 &
sleep 4
curl -s -c /tmp/ut.jar http://localhost:3000/ | grep -o 'Stamp [0-9] of [0-9]' | head -5
curl -s -b /tmp/ut.jar http://localhost:3000/ | grep -o '#[0-9]\{4\}' | head -1
```
Expected: five "Stamp n of 5" labels; second request with the cookie shows the same `#0001`-style number. Open `http://localhost:3000` in a browser: cream frame, duotone photo, tilted card that straightens on scroll, Cooper BT numeral (not a serif fallback), QR under the reward line. Leave the dev server running for Task 14 or stop it.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add hero with scroll motion, card polling, attendee page"
```

---

### Task 14: Staff page — PIN gate, station picker, scanner, stats

**Files:**
- Create: `app/staff/page.tsx`, `components/staff/PinForm.tsx`, `components/staff/StaffConsole.tsx`, `components/staff/Scanner.tsx`, `components/staff/StatsBar.tsx`, `components/staff/staff.module.css`

**Interfaces:**
- Consumes: `login`, `staffAward`, `staffRedeem`, `staffStats`, `staffLookup` (Task 10); `readStaffToken` (Task 9); `EVENT`, `STATS_POLL_MS`.
- Produces: `/staff` route.

- [ ] **Step 1: Install the scanner library**

```bash
npm install html5-qrcode
```

- [ ] **Step 2: Write `components/staff/staff.module.css`**

```css
.page{max-width:560px;margin:0 auto;padding:calc(var(--page-frame) + 72px) var(--space-24) calc(var(--page-frame) + var(--space-48));display:flex;flex-direction:column;gap:var(--space-24)}
.kicker{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted)}
.h1{font:var(--weight-light) var(--t-head)/var(--leading-snug) var(--font-core);color:var(--red);margin:4px 0 0;text-transform:lowercase}
.panel{background:var(--cream-light);border:1px solid var(--border-hairline);border-radius:var(--radius-card);padding:var(--space-24);display:flex;flex-direction:column;gap:var(--space-16)}
.label{font:var(--t-micro) var(--font-display);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-muted)}
.input{font:var(--weight-light) var(--t-body)/1.2 var(--font-core);color:var(--ink);background:var(--white);border:1px solid var(--border-hairline);border-radius:var(--radius-sm);padding:10px 12px;min-height:44px;width:100%}
.input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px var(--red-wash)}
.button{font:var(--weight-medium) var(--t-body) var(--font-core);color:var(--cream);background:var(--red);border:var(--line-rule) solid var(--red);border-radius:var(--radius-pill);padding:11px 22px;min-height:44px;cursor:pointer}
.button:hover{background:var(--red-deep)}
.button:disabled{background:var(--cream-deep);border-color:var(--cream-deep);color:var(--ink-muted);cursor:default}
.secondary{font:var(--weight-medium) var(--t-body) var(--font-core);color:var(--red);background:none;border:var(--line-rule) solid var(--red);border-radius:var(--radius-pill);padding:11px 22px;min-height:44px;cursor:pointer}
.secondary:hover{background:var(--red-wash)}
.secondary[aria-pressed="true"]{background:var(--red);color:var(--cream)}
.stations{display:flex;flex-wrap:wrap;gap:var(--space-8)}
.error{color:var(--red);font:italic var(--weight-light) var(--t-body) var(--font-core);margin:0}
.reader{width:100%;aspect-ratio:1;max-width:100%;background:var(--cream-deep);border-radius:var(--radius-card);overflow:hidden}
.result{border-radius:var(--radius-card);padding:var(--space-24);display:flex;flex-direction:column;gap:6px}
.resultOk{background:var(--red);color:var(--cream)}
.resultInfo{background:var(--cream-light);border:1px solid var(--border-hairline);color:var(--ink)}
.resultTitle{font:var(--weight-medium) var(--t-sub)/1.2 var(--font-core);margin:0}
.resultBody{margin:0}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-16)}
.stat{display:flex;flex-direction:column;gap:2px}
.statN{font:var(--weight-black) var(--t-head)/1 var(--font-core);color:var(--red)}
.row{display:flex;gap:var(--space-8);align-items:flex-end}
```

- [ ] **Step 3: Write `components/staff/PinForm.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/app/actions/staff'
import styles from './staff.module.css'

export function PinForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null })
  return (
    <form action={action} className={styles.panel}>
      <label className={styles.label} htmlFor="pin">
        Staff PIN
      </label>
      <input id="pin" name="pin" className={styles.input} type="password" inputMode="numeric" autoComplete="off" required />
      {state.error && <p className={styles.error}>{state.error}</p>}
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? 'Checking' : 'Open station'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Write `components/staff/StatsBar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { staffStats } from '@/app/actions/staff'
import { STATS_POLL_MS } from '@/lib/config'
import type { EventStats } from '@/lib/staff-ops'
import styles from './staff.module.css'

export function StatsBar({ initial }: { initial: EventStats | null }) {
  const [stats, setStats] = useState(initial)
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      const s = await staffStats()
      if (s) setStats(s)
    }
    const t = setInterval(tick, STATS_POLL_MS)
    return () => clearInterval(t)
  }, [])
  const items = [
    ['Cards', stats?.cards],
    ['Stamps', stats?.stamps],
    ['Matchas', stats?.redeemed],
  ] as const
  return (
    <div className={styles.stats} aria-live="polite">
      {items.map(([label, n]) => (
        <div className={styles.stat} key={label}>
          <span className={styles.statN}>{n ?? '–'}</span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write `components/staff/Scanner.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { staffAward, staffRedeem, staffLookup } from '@/app/actions/staff'
import styles from './staff.module.css'

const READER_ID = 'ut-reader'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COUNTER = 'counter'

type Result = { tone: 'ok' | 'info'; title: string; body: string }

function describe(r: Awaited<ReturnType<typeof staffAward>> | Awaited<ReturnType<typeof staffRedeem>>): Result {
  if (r.status === 'unauthorized') return { tone: 'info', title: 'Signed out', body: 'Reload and enter the PIN again.' }
  if (r.status === 'invalid') return { tone: 'info', title: 'Not a card', body: 'That code is not an unwoventhread card.' }
  if (r.status === 'error') return { tone: 'info', title: 'Something broke', body: 'Try again in a moment.' }
  if (r.status === 'not_found') return { tone: 'info', title: 'Card not found', body: 'Ask them to reload their card page.' }
  const who = r.card.name?.trim() || `#${String(r.card.number).padStart(4, '0')}`
  const tally = `${r.card.collected} of ${r.card.total}`
  switch (r.status) {
    case 'awarded':
      return { tone: 'ok', title: `Stamped ${who}`, body: `${tally} collected.` }
    case 'already':
      return { tone: 'info', title: `${who} already has this one`, body: `${tally} collected.` }
    case 'redeemed':
      return { tone: 'ok', title: `Matcha for ${who}`, body: 'Redeemed. Enjoy.' }
    case 'already_redeemed':
      return { tone: 'info', title: `${who} already redeemed`, body: 'One matcha per card.' }
    case 'incomplete':
      return { tone: 'info', title: `${who} isn't there yet`, body: `${tally} collected.` }
  }
}

export function Scanner({ station }: { station: string }) {
  const [result, setResult] = useState<Result | null>(null)
  const [number, setNumber] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const lastSeen = useRef<{ id: string; at: number }>({ id: '', at: 0 })
  const stationRef = useRef(station)
  stationRef.current = station

  async function handle(cardId: string) {
    const now = Date.now()
    if (lastSeen.current.id === cardId && now - lastSeen.current.at < 5000) return
    lastSeen.current = { id: cardId, at: now }
    const r = stationRef.current === COUNTER ? await staffRedeem(cardId) : await staffAward(cardId, stationRef.current)
    const d = describe(r)
    setResult(d)
    setTimeout(() => setResult((cur) => (cur === d ? null : cur)), 3000)
  }

  useEffect(() => {
    let scanner: { stop(): Promise<void>; clear(): void } | null = null
    let stopped = false
    ;(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        const h = new Html5Qrcode(READER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        })
        scanner = h
        await h.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 240 },
          (text) => {
            if (UUID_RE.test(text)) void handle(text)
          },
          () => {},
        )
        if (stopped) await h.stop()
      } catch (e) {
        setCameraError('Camera unavailable — use the card number below.')
        console.error(e)
      }
    })()
    return () => {
      stopped = true
      scanner?.stop().then(() => scanner?.clear()).catch(() => {})
    }
  }, [])

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(number)
    if (!Number.isInteger(n) || n <= 0) return
    const r = await staffLookup(n)
    if ('status' in r) return setResult({ tone: 'info', title: 'Signed out', body: 'Reload and enter the PIN again.' })
    if (!r.cardId) return setResult({ tone: 'info', title: 'No such card', body: `No card #${n} for this event.` })
    setNumber('')
    lastSeen.current = { id: '', at: 0 }
    await handle(r.cardId)
  }

  return (
    <div className={styles.panel}>
      <div id={READER_ID} className={styles.reader} />
      {cameraError && <p className={styles.error}>{cameraError}</p>}
      {result && (
        <div className={`${styles.result} ${result.tone === 'ok' ? styles.resultOk : styles.resultInfo}`} role="status">
          <p className={styles.resultTitle}>{result.title}</p>
          <p className={styles.resultBody}>{result.body}</p>
        </div>
      )}
      <form onSubmit={lookup} className={styles.row}>
        <label style={{ flex: 1 }}>
          <span className={styles.label}>Card number</span>
          <input className={styles.input} inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="0042" />
        </label>
        <button className={styles.secondary} type="submit">
          Find
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Write `components/staff/StaffConsole.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { EVENT } from '@/lib/config'
import type { EventStats } from '@/lib/staff-ops'
import { Scanner } from './Scanner'
import { StatsBar } from './StatsBar'
import styles from './staff.module.css'

const KEY = 'unwoventhread:station'
const STATIONS = [...EVENT.actions.map((a) => ({ key: a.key, label: a.label })), { key: 'counter', label: 'Counter (redeem)' }]

export function StaffConsole({ stats }: { stats: EventStats | null }) {
  const [station, setStation] = useState<string | null>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved && STATIONS.some((s) => s.key === saved)) setStation(saved)
    } catch {}
  }, [])
  function pick(key: string) {
    setStation(key)
    try {
      localStorage.setItem(KEY, key)
    } catch {}
  }
  return (
    <>
      <StatsBar initial={stats} />
      <div className={styles.panel}>
        <span className={styles.label}>Your station</span>
        <div className={styles.stations}>
          {STATIONS.map((s) => (
            <button key={s.key} type="button" className={styles.secondary} aria-pressed={station === s.key} onClick={() => pick(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {station && <Scanner station={station} />}
    </>
  )
}
```

- [ ] **Step 7: Write `app/staff/page.tsx`**

```tsx
import { cookies } from 'next/headers'
import { STAFF_COOKIE, getSecret } from '@/lib/cookies'
import { readStaffToken } from '@/lib/staff-session'
import { getEventStats } from '@/lib/staff-ops'
import { EVENT } from '@/lib/config'
import { PinForm } from '@/components/staff/PinForm'
import { StaffConsole } from '@/components/staff/StaffConsole'
import styles from '@/components/staff/staff.module.css'

export const metadata = { title: 'unwoventhread — station', robots: { index: false } }

export default async function StaffPage() {
  const store = await cookies()
  const authed = readStaffToken(store.get(STAFF_COOKIE)?.value, getSecret())
  let stats = null
  if (authed) {
    try {
      stats = await getEventStats(EVENT.slug)
    } catch (e) {
      console.error('stats failed', e)
    }
  }
  return (
    <main className={styles.page}>
      <div>
        <span className={styles.kicker}>Station — {EVENT.name}</span>
        <h1 className={styles.h1}>stamp a card</h1>
      </div>
      {authed ? <StaffConsole stats={stats} /> : <PinForm />}
    </main>
  )
}
```

- [ ] **Step 8: Build and walk the flow end to end**

```bash
npx tsc --noEmit && npm run build && npm run dev -- -p 3000 &
```
1. Browser A: open `http://localhost:3000`, note the card number, optionally type a name.
2. Browser B (or a phone on the same network; camera needs https or localhost — on a phone use the card-number fallback): open `/staff`, enter the PIN, pick "Visit a booth", type the card number, Find. Expected: red "Stamped #0001" panel, stats increment.
3. Browser A: within ~4 s slot 1 fills red with a cream numeral.
4. Repeat for all five stations; reward line changes to "All five…". Pick "Counter (redeem)", Find again → "Matcha for …"; attendee reward line → "Enjoyed — see you next time." Find again → "already redeemed".
5. Wrong PIN → "Wrong PIN". Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Add staff station page: PIN gate, scanner, stats"
```

---

### Task 15: Verification pass and preview deploy

**Files:**
- Modify: whatever the checks flag; `README.md` (create)

- [ ] **Step 1: Full checks**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```
Expected: all green. Fix anything flagged; do not disable rules. One allowed exception: if `react-hooks/set-state-in-effect` fires on the localStorage read in `StaffConsole` (a client-only read that must happen after hydration), add `// eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage read after hydration` on that line only.

- [ ] **Step 2: Responsive and font check**

Run the dev server, open `/` at 1440px and at 400px wide (devtools). Confirm: no horizontal scroll, card fits inside the frame at 400px, oval accent doesn't overlap the card, the numeral renders in Cooper BT Black (devtools → Computed → rendered fonts shows "Cooper BT"), Special Elite on the month/labels. Take screenshots of both and save them under the scratchpad for the user to compare against the reference.

- [ ] **Step 3: Write a short `README.md`**

```markdown
# unwoventhread-web

Loyalty-card site for the unwoventhread Pilot Market. Next.js 16, Neon Postgres via Vercel.

- `/` — an attendee's card (auto-issued, signed cookie). Stamps appear within a few seconds of being awarded.
- `/staff` — PIN-gated station page: pick a station, scan the card QR (or enter the card number) to award a stamp; "Counter" redeems the matcha.

## Run locally
    npm install
    vercel env pull .env.local --yes   # DATABASE_URL, CARD_COOKIE_SECRET, STAFF_PIN
    npm run db:push && npm run db:seed
    npm run dev

## Change the event
Edit `lib/config.ts` (date, venue, reward, the actions list) and run `npm run db:seed` again. Slot count follows the actions list.

## Tests
    npm test

Design source: Claude Design project "unwoventhread Design System" → `loyalty-card-skill/`. Spec in `docs/superpowers/specs/`.
```

- [ ] **Step 4: Commit and deploy a preview**

```bash
git add -A && git commit -m "Add README and verification fixes"
vercel deploy --yes
```
Expected: a preview URL. Open it: the card issues, `/staff` accepts the PIN. Report the URL to the user along with the screenshot paths. Do not promote to production without being asked.
