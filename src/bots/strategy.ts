// strategy.ts — bot decision-making.
//
// Every difficulty shares one engine: rank the card's hands by the matcher's
// "tiles-short" distance for the bot's rack, commit to the closest, and keep the
// tiles that serve it. Difficulty tunes greediness, calling, and randomness.

import type { Hand } from '../engine/cardSchema';
import {
  type Difficulty,
  type GameState,
  fullRack,
  isJoker,
  legalExposureCounts,
} from '../engine/game';
import { matchHand } from '../engine/matcher';
import type { Tile } from '../engine/tiles';

export type CallDecision =
  | { type: 'mahjong' }
  | { type: 'exposure'; count: number }
  | { type: 'pass' };

export interface BotStrategy {
  chooseCharlestonPass(state: GameState, seat: number): string[];
  chooseDiscard(state: GameState, seat: number): string;
  decideCall(state: GameState, seat: number): CallDecision;
}

// --- shared helpers --------------------------------------------------------

function allowedHands(state: GameState, seat: number): Hand[] {
  const p = state.players[seat];
  const concealedOK = p.exposures.length === 0;
  return state.card.hands.filter((h) => concealedOK || !h.concealed);
}

function bestDistance(rack: Tile[], hands: Hand[]): number {
  let best = Infinity;
  for (const h of hands) best = Math.min(best, matchHand(rack, h).tilesShort);
  return best;
}

/** Non-joker concealed tiles ranked from most to least expendable. */
function expendableRanking(state: GameState, seat: number): { id: string; impact: number }[] {
  const p = state.players[seat];
  const hands = allowedHands(state, seat);
  const exposedTiles = p.exposures.flatMap((e) => e.tiles);
  const candidates = p.concealed.filter((t) => !isJoker(t));
  return candidates
    .map((t) => {
      const without = [...p.concealed.filter((x) => x.id !== t.id), ...exposedTiles];
      // Lower resulting distance => the tile was less needed => more expendable.
      return { id: t.id, impact: bestDistance(without, hands) };
    })
    .sort((a, b) => a.impact - b.impact);
}

// --- heuristic bot ---------------------------------------------------------

export class HeuristicBot implements BotStrategy {
  constructor(private difficulty: Difficulty) {}

  chooseCharlestonPass(state: GameState, seat: number): string[] {
    // Jokers may never be passed in the Charleston; pass the 3 most expendable.
    const ranked = expendableRanking(state, seat);
    const ids = ranked.slice(0, 3).map((r) => r.id);
    // Pad defensively if somehow short (shouldn't happen with 13 tiles).
    const p = state.players[seat];
    for (const t of p.concealed) {
      if (ids.length >= 3) break;
      if (!isJoker(t) && !ids.includes(t.id)) ids.push(t.id);
    }
    return ids;
  }

  chooseDiscard(state: GameState, seat: number): string {
    const ranked = expendableRanking(state, seat);
    if (ranked.length === 0) {
      // Only jokers left (extremely rare) — forced to discard one.
      return state.players[seat].concealed[0].id;
    }
    if (this.difficulty === 'easy') {
      // Weak play: usually toss the most expendable, but sometimes a random one
      // from the bottom half, so an easy bot is beatable.
      if (Math.random() < 0.4) {
        const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
        return pool[Math.floor(Math.random() * pool.length)].id;
      }
      return ranked[0].id;
    }
    if (this.difficulty === 'hard') {
      // Defensive tie-break: among the equally-expendable best discards, prefer
      // the tile most already visible in discards (safer to release).
      const top = ranked.filter((r) => r.impact === ranked[0].impact);
      if (top.length > 1) {
        const seen = (id: string) => {
          const tile = state.players[seat].concealed.find((t) => t.id === id)!;
          return state.discards.filter((d) => d.kind === tile.kind && d.rank === tile.rank).length;
        };
        top.sort((a, b) => seen(b.id) - seen(a.id));
      }
      return top[0].id;
    }
    return ranked[0].id; // medium / llm-fallback: pure greedy
  }

  decideCall(state: GameState, seat: number): CallDecision {
    // Always take a win.
    const p = state.players[seat];
    const ld = state.lastDiscard;
    if (!ld) return { type: 'pass' };

    // Only exposures that are legal against the card are considered.
    const legal = legalExposureCounts(state, seat);
    if (legal.length === 0) return { type: 'pass' };
    if (this.difficulty === 'easy' && Math.random() > 0.25) return { type: 'pass' };

    const hands = allowedHands(state, seat);
    const dNow = bestDistance(fullRack(p), hands);
    const dWith = bestDistance([...fullRack(p), ld.tile], hands);
    if (dWith < dNow) {
      // Hard bots prefer the largest legal group (locks a kong); others the
      // smallest to spare jokers.
      const count = this.difficulty === 'hard' ? legal[legal.length - 1] : legal[0];
      return { type: 'exposure', count };
    }
    return { type: 'pass' };
  }
}

/** Factory used by the orchestrator. */
export function makeBot(difficulty: Difficulty): BotStrategy {
  return new HeuristicBot(difficulty === 'llm' ? 'medium' : difficulty);
}
