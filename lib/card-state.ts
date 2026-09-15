/** Card shape shared by the page, Hero and (later) the staff actions.
 *  DB-backed helpers (ensureCard / loadCardState / updateCardName) land with the database task —
 *  until then the page renders the "unavailable" state with these types only. */

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
