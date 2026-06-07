// Card schema: how we represent NMJL-style hands generically.
//
// An NMJL card lists ~50-70 "hands" grouped into categories. Each printed hand is
// really a *pattern*: the numbers, suits and colours shown are templates. For
// example "FF 2026 2026" with a colour rule means: two flowers, then the digits
// of the year in one suit, then the digits of the year in a *different* suit.
//
// We capture a hand as an ordered list of GROUPS plus a few constraints. The
// matcher (matcher.ts) instantiates the free variables (the base number for runs,
// and which concrete suits the abstract suit labels map to) when checking a rack.

import type { Dragon, Suit, Wind } from './tiles';

/** What a group's tiles represent. */
export type GroupRole =
  | 'number' // ordinary suit tiles of a given rank (see numberRef)
  | 'flower' // flower tiles
  | 'dragon' // dragon tiles, colour-bound to the group's suit
  | 'soap' // white dragon specifically (also used as the "0" in year hands)
  | 'wind' // a specific wind tile
  | 'yearDigit'; // a digit of the configured game year (0 -> soap)

/**
 * A group of identical-by-pattern tiles.
 *
 * count:    how many tiles (1 single, 2 pair, 3 pung, 4 kong, 5 quint).
 * role:     what the tiles are (see GroupRole).
 * suitRef:  abstract suit label. Groups sharing a label must be the SAME suit;
 *           groups with different labels must be DIFFERENT suits. Use undefined
 *           for tiles that have no suit (flowers, winds, soap).
 * numberRef: for role 'number', either a fixed rank (e.g. 5) or a run variable:
 *           'n', 'n+1', 'n+2', 'n+3' — the base 'n' is solved within range.
 * value:    for role 'wind', which wind; for 'yearDigit', the digit position is
 *           taken from the year string instead (see Hand.year handling).
 */
export interface Group {
  count: number;
  role: GroupRole;
  suitRef?: string;
  numberRef?: number | 'n' | 'n+1' | 'n+2' | 'n+3';
  wind?: Wind;
  dragon?: Dragon; // optional explicit dragon for role 'dragon' when not suit-bound
  /** The digit (0-9) for role 'yearDigit'; filled when a card is built for a year. */
  digit?: number;
}

export type HandCategory =
  | 'Year'
  | 'Like Numbers'
  | 'Consecutive Run'
  | 'Evens'
  | 'Odds'
  | '2468'
  | '13579'
  | 'Winds-Dragons'
  | 'Singles and Pairs'
  | 'Quints'
  | 'Other';

export interface Hand {
  id: string;
  category: HandCategory;
  /** Short display name, e.g. "FF 2026 2026". */
  name: string;
  groups: Group[];
  /** How many DISTINCT suits the hand must use (the card's colour rule). */
  distinctSuits: number;
  /** Concealed hands may not be completed by calling a discard for exposure. */
  concealed: boolean;
  points: number;
  /** Optional note shown in the card viewer. */
  note?: string;
}

export interface MahjongCard {
  /** e.g. 2026. The demo card uses 0 to mean "year-agnostic demo". */
  year: number;
  name: string;
  hands: Hand[];
  /** Whether this is the built-in original demo card (read-only-ish). */
  isDemo?: boolean;
}

/** Total tiles a legal hand must contain (American Mahjong is always 14). */
export const HAND_SIZE = 14;

/** Sanity check used by tests and the editor: every hand totals 14 tiles. */
export function handTileCount(hand: Hand): number {
  return hand.groups.reduce((sum, g) => sum + g.count, 0);
}

export function isHandWellFormed(hand: Hand): boolean {
  return handTileCount(hand) === HAND_SIZE;
}

/**
 * Expand the digits of a year into a sequence (e.g. 2026 -> [2,0,2,6]).
 * Used when building a Year-category hand for a concrete year.
 */
export function yearDigits(year: number): number[] {
  return String(year)
    .split('')
    .map((c) => Number(c));
}

/** Suit label used in display (the abstract A/B/C). */
export function suitRefLabel(ref?: string): string {
  return ref ?? '';
}

export type { Suit, Wind, Dragon };
