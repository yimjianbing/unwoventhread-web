# unwoventhread loyalty-card site — design

Date: 2026-09-14
Source: Claude Design project "unwoventhread Design System" (`7a4e3e48-9588-45f8-8192-492e686029ea`), folder `loyalty-card-skill/`. The reference page `reference/loyalty-card.html`, `tokens.css`, and `README.md` (brand guideline) are the visual and tonal source of truth. Read them before implementing; do not re-derive the card or its motion.

## Goal

A single-page site for unwoventhread's Pilot Market. Every attendee who opens it gets a unique loyalty card — a tear-off calendar page — with five stamp slots. Staff at stations scan the attendee's card QR to award stamps. Five stamps earn a free matcha, redeemed at the counter. Every card issued is recorded so the team knows how many attendees came. Free all the way: no signup, no payment, no download.

## Non-goals

- Accounts, email, or any login for attendees.
- Realtime push; polling is sufficient.
- Multi-event admin UI. One event row seeded; schema allows more.
- Print/PDF card export, custom cursor, overlay menu (guideline mentions these for later).

## Stack

- Next.js 16, App Router, TypeScript. No Tailwind, no UI library.
- Styling: `app/tokens.css` (global; the design project's `tokens.css` minus `@font-face`/`@import`) + CSS Modules per component containing the reference CSS verbatim where possible.
- Fonts: Cooper BT via `next/font/local` (7 faces, `.ttf` from the design project converted to `.woff2` under `public/fonts/cooper-bt/`); Special Elite via `next/font/google`. Both expose CSS variables that `tokens.css` maps to `--font-core` / `--font-display`.
- Database: Neon Postgres provisioned through the Vercel Marketplace (`vercel integration add neon`), Drizzle ORM, lazy `getDb()` (no module-level client, no Proxy wrappers).
- Deployed on Vercel.

## Project structure

```
app/
  layout.tsx            fonts, tokens.css, Grain + Frame + Nav
  page.tsx              attendee page (server component; issues card, renders hero etc.)
  staff/page.tsx        staff page (PIN gate → station picker → scanner)
  tokens.css
  actions/              server actions: card.ts (getCardState, setName), staff.ts (login, awardStamp, redeem, getEventStats)
components/
  Grain.tsx  Frame.tsx
  PillButton.tsx + .module.css      vertical-swap hover label (nav pill, CTA)
  Nav.tsx + .module.css             menu pill + wordmark pill
  Hero.tsx + .module.css            stage, duotone ground, oval accent; owns scroll motion; mounts StampCard
  StampCard.tsx + .module.css       the tear-off page (presentational)
  CardQr.tsx                        inline SVG QR of the card id
  NameField.tsx                     optional "your name" inline field
  Ticker.tsx  Steps.tsx  Footer.tsx (+ .module.css)
  staff/PinForm.tsx  StationPicker.tsx  Scanner.tsx  StatsBar.tsx
lib/
  db/index.ts  schema.ts  seed.ts
  cookies.ts            HMAC sign/verify for card and staff cookies
  card-state.ts         query helpers → CardState
  ratelimit.ts          in-memory sliding window for card issuance
  config.ts             event slug, poll interval, copy strings
public/
  images/logo-wordmark.png logo-alt.png photo-fabric-rolls.png
  fonts/cooper-bt/*.woff2
docs/superpowers/specs/
```

## Data model (Drizzle schema)

```
events   id serial PK, slug text unique, name text, date date, venue text, reward_text text
actions  id serial PK, event_id FK, key text, label text, position int   — unique (event_id, key)
cards    id uuid PK default gen_random_uuid(), event_id FK, number serial,
         name text null, created_at timestamptz default now(), redeemed_at timestamptz null
stamps   card_id uuid FK, action_id int FK, awarded_at timestamptz default now(), awarded_by text
         PK (card_id, action_id)
```

Seed: one event `pilot-market` (name "Pilot Market", venue "Tiong Bahru CC", date from config, reward "Collect five and take home a matcha, on us."); five actions in order: `booth` "Visit a booth", `photostrip` "Take a photostrip", `follow` "Follow @unwoventhread", `workshop` "Join a workshop", `thrift` "Thrift something". Labels are editable before the day; the card never hard-codes five — slot count is `actions.length`.

Attendee count = `count(cards where event_id)`. Stamp uniqueness is enforced by the PK; awarding an existing stamp returns `already`, never a second row.

## Attendee flow (`/`)

1. Server component reads cookie `ut_card` (signed, httpOnly, SameSite=Lax, 1 year). Missing/invalid → rate-limit check by IP → insert card → set cookie. Renders with real state; no client-side flash.
2. `CardState = { id, number, name, event: {name, venue, date}, slots: {key, label, position}[], collected: key[], redeemedAt }`.
3. Hero renders the reference layout exactly: fixed cream frame, grain overlay, pill nav, wordmark pill, duotone ground, oval "stitch with us", tear-off card. The card's month/day/weekday derive from `event.date`. Almanac lines: Member → `name ?? '#0042'`-style number; Event → event name; Venue; Follow → `@unwoventhread`.
4. Slots are display-only `<span role="img" aria-label="Stamp 3 of 5: collected">`; a newly collected slot plays the reference fill animation (`scale(0→1)`, 260ms) once.
5. Under the reward line: `CardQr` (card id, ~96px, red on cream-light) and `NameField` (placeholder "your name", saves on blur via `setName`, max 40 chars).
6. A client hook polls `getCardState()` every 4 s while `document.visibilityState === 'visible'`; diffs `collected` to trigger animations.
7. Reward line copy by state: `<5` → reward_text; `5/5` → "All five. Show this at the counter for your matcha."; redeemed → "Enjoyed — see you next time."
8. The rest of the page (overline, ticker, "02 — The card" prose, CTA, three steps, footer) is the reference content. The CTA "Collect a stamp" scrolls to the card.

## Staff flow (`/staff`)

1. No `ut_staff` cookie → `PinForm`. Server action `login(pin)` compares against `STAFF_PIN` (constant-time), sets signed `ut_staff` cookie (httpOnly, expires end of day UTC+8).
2. `StationPicker`: the five actions plus "Counter (redeem)"; choice stored in localStorage.
3. `Scanner`: camera QR scan using `BarcodeDetector` when available, else `html5-qrcode`. Manual "enter card number" fallback (looks up by `cards.number`). On a decode:
   - station is an action → `awardStamp(cardId, actionKey)` → result `awarded | already | not_found`.
   - station is Counter → `redeem(cardId)` → `redeemed | incomplete(n/5) | already_redeemed | not_found`.
   Result shown as a full-width red or cream panel with the attendee's name/number and the stamp tally; auto-clears after 3 s; a debounce ignores the same code for 5 s.
4. `StatsBar`: cards issued, stamps awarded, matchas redeemed; polls `getEventStats()` every 10 s.

Staff pages use the same tokens (red on cream, Special Elite labels, Cooper body); utilitarian layout, no hero.

## Security and failure handling

- Cookies carry `value.signature` with HMAC-SHA256 over `CARD_COOKIE_SECRET`; verification is constant-time. The QR encodes only the card UUID.
- All staff actions re-verify the staff cookie server-side; attendee actions only act on the card in the caller's own cookie.
- Inputs validated with zod. Errors from actions are typed results, never thrown to the client.
- Card issuance rate-limited to 5 per IP per 10 minutes (in-memory; acceptable for a one-day event on one deployment).
- If the DB is unreachable on `/`, render the full reference layout with the card's almanac lines replaced by "Card unavailable — find a staff member." No 500 page.
- `getDb()` is lazy so `next build` succeeds before env vars exist.

## Motion

Ported from the reference, not re-derived: rAF-throttled scroll/resize listener in `Hero` computes progress from the stage rect, writes `transform` on card and ground, toggles `data-lift` at 0.75. `prefers-reduced-motion` → upright card, no listener. Entrance stagger (`rise`/`fade`) and ticker `slide` stay in CSS.

## Environment

`DATABASE_URL` (Neon, provisioned), `CARD_COOKIE_SECRET`, `STAFF_PIN`. Local dev via `vercel env pull .env.local --yes`; Drizzle scripts run with `dotenv -e .env.local`.

## Testing

- Vitest unit: `cookies.ts` sign/verify (tamper → invalid); `awardStamp` idempotency; `redeem` refuses `<5` and refuses twice; zod rejection of bad input; rate limiter window.
- Integration (against `DATABASE_URL`, skipped when unset): card issuance creates one row and one cookie; count increments.
- Testing Library: `StampCard` renders `slots.length` slots with correct collected states and reward copy for `<5`, `5/5`, redeemed.
- `next build`, `tsc --noEmit`, `next lint` clean.
- Manual: issue a card in one browser, stamp from `/staff` in another, observe fill within the poll interval; screenshot hero at 1440px and 400px against the reference; confirm Cooper BT loaded (not Georgia).

## Open items for the team (not blocking)

- Final action names and the event date.
- Whether the "Menu" pill should do anything on a one-page site (currently decorative, as in the reference).
