import { COPY } from './config'

export function rewardCopy(collected: number, total: number, redeemedAt: string | null, rewardText: string): string {
  if (redeemedAt) return COPY.redeemed
  if (total > 0 && collected >= total) return COPY.complete
  return rewardText
}
