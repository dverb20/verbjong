// scoring.ts — base hand value plus common American Mahjong bonuses.
//
// The card's `points` is the base. We add the two most universal bonuses:
//   - jokerless: the winning hand used zero jokers.
//   - self-pick: the winner drew the final tile themselves (not off a discard).
// (These are configurable / extensible; many tables also double for concealed.)

import type { Hand } from './cardSchema';
import { isJoker, type Tile } from './tiles';

export interface ScoreBreakdown {
  base: number;
  jokerlessBonus: number;
  selfPickBonus: number;
  concealedBonus: number;
  total: number;
}

export function scoreWin(opts: {
  hand: Hand;
  rack: Tile[];
  selfPick: boolean;
  exposed: boolean;
}): ScoreBreakdown {
  const base = opts.hand.points;
  const usedJoker = opts.rack.some(isJoker);
  const jokerlessBonus = usedJoker ? 0 : Math.round(base * 0.5);
  const selfPickBonus = opts.selfPick ? Math.round(base * 0.2) : 0;
  const concealedBonus = !opts.exposed && !opts.hand.concealed ? Math.round(base * 0.2) : 0;
  return {
    base,
    jokerlessBonus,
    selfPickBonus,
    concealedBonus,
    total: base + jokerlessBonus + selfPickBonus + concealedBonus,
  };
}
