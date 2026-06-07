// matcher.ts — the heart of the engine.
//
// Given a rack of tiles and a card Hand (a pattern with free variables), decide:
//   - is the rack a COMPLETE instance of the hand? (win detection)
//   - if not, how many tiles short is it? (distance — drives all bot strategy)
//
// The free variables we solve for:
//   1. the base number `n` for runs / like-numbers (numberRef 'n','n+1',...);
//   2. which concrete suit each abstract suit label (A/B/C) maps to — distinct
//      labels must map to distinct suits.
// Dragons are colour-bound to their group's assigned suit; soap = white dragon;
// the digit 0 in Year hands = soap. Jokers may fill any slot in a group of 3+.

import type { Group, Hand } from './cardSchema';
import { DRAGON_OF_SUIT, isJoker, type Suit, type Tile, tileKey } from './tiles';
import { HAND_SIZE } from './cardSchema';

const ALL_SUITS: Suit[] = ['bam', 'crak', 'dot'];

export interface MatchResult {
  /** True iff the rack is exactly a legal 14-tile instance of the hand. */
  isComplete: boolean;
  /** Minimum tiles that still need to be acquired to complete this hand. */
  tilesShort: number;
  /** The concrete suit mapping & base number that achieved the best result. */
  assignment?: { suits: Record<string, Suit>; n?: number };
}

/** One concrete required slot-group after variables are bound. */
interface ConcreteReq {
  key: string;
  count: number;
  jokerOK: boolean;
}

function resolveNumber(ref: Group['numberRef'], n: number | undefined): number {
  if (typeof ref === 'number') return ref;
  if (ref === undefined) return n ?? 1;
  const base = n ?? 1;
  switch (ref) {
    case 'n':
      return base;
    case 'n+1':
      return base + 1;
    case 'n+2':
      return base + 2;
    case 'n+3':
      return base + 3;
  }
}

/** Largest run offset used by the hand (0 if it uses no run variable). */
function maxRunOffset(hand: Hand): number | null {
  let max = -1;
  for (const g of hand.groups) {
    if (g.numberRef === 'n') max = Math.max(max, 0);
    else if (g.numberRef === 'n+1') max = Math.max(max, 1);
    else if (g.numberRef === 'n+2') max = Math.max(max, 2);
    else if (g.numberRef === 'n+3') max = Math.max(max, 3);
  }
  return max < 0 ? null : max;
}

/** Distinct abstract suit labels referenced by the hand, in stable order. */
function suitLabels(hand: Hand): string[] {
  const seen: string[] = [];
  for (const g of hand.groups) {
    if (g.suitRef && !seen.includes(g.suitRef)) seen.push(g.suitRef);
  }
  return seen;
}

/** All injective maps from labels -> distinct concrete suits. */
function suitAssignments(labels: string[]): Record<string, Suit>[] {
  if (labels.length === 0) return [{}];
  const results: Record<string, Suit>[] = [];
  const used = new Set<Suit>();
  const cur: Record<string, Suit> = {};
  const recurse = (i: number) => {
    if (i === labels.length) {
      results.push({ ...cur });
      return;
    }
    for (const s of ALL_SUITS) {
      if (used.has(s)) continue;
      used.add(s);
      cur[labels[i]] = s;
      recurse(i + 1);
      used.delete(s);
      delete cur[labels[i]];
    }
  };
  recurse(0);
  return results;
}

/** Turn one group into its concrete requirement under a given assignment. */
function concreteReq(g: Group, suits: Record<string, Suit>, n: number | undefined): ConcreteReq {
  const jokerOK = g.count >= 3;
  const suit = g.suitRef ? suits[g.suitRef] : undefined;
  let key: string;
  switch (g.role) {
    case 'flower':
      key = 'flower';
      break;
    case 'soap':
      key = 'dragon-white';
      break;
    case 'wind':
      key = `wind-${g.wind}`;
      break;
    case 'dragon': {
      const dragon = g.dragon ?? (suit ? DRAGON_OF_SUIT[suit] : 'white');
      key = `dragon-${dragon}`;
      break;
    }
    case 'yearDigit': {
      const d = g.digit ?? 0;
      key = d === 0 ? 'dragon-white' : `${suit}${d}`;
      break;
    }
    case 'number': {
      const rank = resolveNumber(g.numberRef, n);
      key = `${suit}${rank}`;
      break;
    }
  }
  return { key, count: g.count, jokerOK };
}

/** Count rack tiles by kind key, plus jokers separately. */
function tally(rack: Tile[]): { naturals: Map<string, number>; jokers: number } {
  const naturals = new Map<string, number>();
  let jokers = 0;
  for (const t of rack) {
    if (isJoker(t)) {
      jokers++;
      continue;
    }
    const k = tileKey(t);
    naturals.set(k, (naturals.get(k) ?? 0) + 1);
  }
  return { naturals, jokers };
}

/**
 * Given concrete requirements and a rack tally, compute how many of the 14 slots
 * remain unfilled (the distance). Naturals are preferred for non-joker slots so
 * jokers are saved for slots that actually allow them.
 */
function distanceFor(reqs: ConcreteReq[], naturals: Map<string, number>, jokers: number): number {
  // Aggregate per key: how many non-joker slots and joker slots need this key.
  const perKey = new Map<string, { nonJoker: number; joker: number }>();
  for (const r of reqs) {
    const e = perKey.get(r.key) ?? { nonJoker: 0, joker: 0 };
    if (r.jokerOK) e.joker += r.count;
    else e.nonJoker += r.count;
    perKey.set(r.key, e);
  }

  let unfilledNonJoker = 0;
  let unfilledJokerSlots = 0;
  for (const [key, need] of perKey) {
    let avail = naturals.get(key) ?? 0;
    // Naturals to non-joker slots first.
    const usedNon = Math.min(need.nonJoker, avail);
    avail -= usedNon;
    unfilledNonJoker += need.nonJoker - usedNon;
    // Leftover naturals to joker slots.
    const usedJok = Math.min(need.joker, avail);
    unfilledJokerSlots += need.joker - usedJok;
  }

  // Jokers fill remaining joker-eligible slots, globally.
  const jokerFilled = Math.min(unfilledJokerSlots, jokers);
  return unfilledNonJoker + (unfilledJokerSlots - jokerFilled);
}

/**
 * Best match of a rack against a single hand, searching all variable bindings.
 * The rack may have fewer than 14 tiles (mid-game): distance reflects tiles still
 * needed. isComplete requires an exact 14-tile rack with distance 0.
 */
export function matchHand(rack: Tile[], hand: Hand): MatchResult {
  const { naturals, jokers } = tally(rack);
  const labels = suitLabels(hand);
  const assignments = suitAssignments(labels);
  const offset = maxRunOffset(hand);
  const nCandidates: (number | undefined)[] =
    offset === null
      ? [undefined]
      : Array.from({ length: 9 - offset }, (_, i) => i + 1); // n = 1 .. 9-offset

  let best: MatchResult = { isComplete: false, tilesShort: Number.POSITIVE_INFINITY };

  for (const suits of assignments) {
    for (const n of nCandidates) {
      const reqs = hand.groups.map((g) => concreteReq(g, suits, n));
      const dist = distanceFor(reqs, naturals, jokers);
      if (dist < best.tilesShort) {
        best = { isComplete: false, tilesShort: dist, assignment: { suits, n } };
        if (dist === 0) break;
      }
    }
    if (best.tilesShort === 0) break;
  }

  best.isComplete = best.tilesShort === 0 && rack.length === HAND_SIZE;
  return best;
}

export interface HandRanking extends MatchResult {
  hand: Hand;
}

/** Rank every hand on a card by how close the rack is to completing it. */
export function rankHands(rack: Tile[], hands: Hand[]): HandRanking[] {
  return hands
    .map((hand) => ({ hand, ...matchHand(rack, hand) }))
    .sort((a, b) => a.tilesShort - b.tilesShort);
}

/** The single closest hand (or undefined if the card has no hands). */
export function findBestHand(rack: Tile[], hands: Hand[]): HandRanking | undefined {
  return rankHands(rack, hands)[0];
}

/** True iff the rack is a winning hand for any hand on the card. */
export function isWinningRack(rack: Tile[], hands: Hand[]): HandRanking | undefined {
  if (rack.length !== HAND_SIZE) return undefined;
  for (const hand of hands) {
    const res = matchHand(rack, hand);
    if (res.isComplete) return { hand, ...res };
  }
  return undefined;
}
