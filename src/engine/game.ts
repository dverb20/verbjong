// game.ts — the American Mahjong game state machine (pure functions).
//
// The UI/orchestrator (state/store.ts) drives bots and the call window; this
// module owns all the rules: dealing, the Charleston, drawing, discarding,
// calling a discard for an exposure, joker exchange, and win/draw detection.
//
// Design notes / pragmatic simplifications (documented in README):
//  - A player's final hand is validated by combining their concealed tiles with
//    every exposed tile into one 14-tile rack and running the matcher. This is
//    equivalent to the real rules for legality and lets jokers settle optimally.
//  - To call a discard for an exposure you must hold >= 2 natural matches; jokers
//    may pad the group up to kong/quint size.

import type { MahjongCard } from './cardSchema';
import { isWinningRack, matchHand } from './matcher';
import {
  buildWall,
  deal,
  isJoker,
  shuffle,
  type Tile,
  tileKey,
  tileLabel,
} from './tiles';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'llm';
export type Phase = 'charleston' | 'play' | 'result';
export type TurnState = 'awaitingDraw' | 'awaitingDiscard' | 'callWindow';

export interface Exposure {
  tiles: Tile[];
  /** Kind key of the natural tiles in this exposure (for joker exchange). */
  naturalKey: string;
}

export interface Player {
  seat: number;
  name: string;
  isBot: boolean;
  difficulty: Difficulty;
  concealed: Tile[];
  exposures: Exposure[];
}

export type CharlestonStep =
  | { dir: 'right'; round: 1 }
  | { dir: 'across'; round: 1 }
  | { dir: 'left'; round: 1 }
  | { dir: 'left'; round: 2 }
  | { dir: 'across'; round: 2 }
  | { dir: 'right'; round: 2 };

export const CHARLESTON_SEQUENCE: CharlestonStep[] = [
  { dir: 'right', round: 1 },
  { dir: 'across', round: 1 },
  { dir: 'left', round: 1 },
  { dir: 'left', round: 2 },
  { dir: 'across', round: 2 },
  { dir: 'right', round: 2 },
];

export interface GameState {
  phase: Phase;
  year: number;
  card: MahjongCard;
  players: Player[];
  wall: Tile[];
  discards: Tile[];
  currentSeat: number;
  turnState: TurnState;
  lastDiscard?: { tile: Tile; seat: number };
  /** Index into CHARLESTON_SEQUENCE; undefined once the Charleston is done. */
  charlestonIndex?: number;
  /** Set true when the human opts to stop after the first Charleston round. */
  charlestonStopped?: boolean;
  winner?: { seat: number; handId: string; handName: string; points: number };
  result?: 'win' | 'wall';
  log: string[];
  dealerSeat: number;
}

export interface NewGameOptions {
  year: number;
  card: MahjongCard;
  botDifficulty: Difficulty;
  charlestonEnabled: boolean;
  playerName?: string;
  rng?: () => number;
}

const SEAT_NAMES = ['You', 'Rina', 'Bea', 'Max'];

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function log(state: GameState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 200) state.log.shift();
}

// --- setup -----------------------------------------------------------------

export function createGame(opts: NewGameOptions): GameState {
  const wall = shuffle(buildWall(), opts.rng);
  const { hands, wall: rest } = deal(wall);
  const players: Player[] = hands.map((concealed, seat) => ({
    seat,
    name: SEAT_NAMES[seat] ?? `P${seat}`,
    isBot: seat !== 0,
    difficulty: seat === 0 ? 'easy' : opts.botDifficulty,
    concealed,
    exposures: [],
  }));
  if (opts.playerName) players[0].name = opts.playerName;

  const state: GameState = {
    phase: opts.charlestonEnabled ? 'charleston' : 'play',
    year: opts.year,
    card: opts.card,
    players,
    wall: rest,
    discards: [],
    currentSeat: 0, // East / dealer leads
    turnState: 'awaitingDiscard', // dealer holds 14 and discards first
    charlestonIndex: opts.charlestonEnabled ? 0 : undefined,
    log: [],
    dealerSeat: 0,
  };
  log(state, opts.charlestonEnabled ? 'Charleston begins — pass 3 to the right.' : 'Game on — East discards first.');
  return state;
}

// --- charleston ------------------------------------------------------------

/** Seat that `seat` passes to for a given direction. */
function passTarget(seat: number, dir: 'right' | 'across' | 'left'): number {
  if (dir === 'right') return (seat + 1) % 4;
  if (dir === 'left') return (seat + 3) % 4;
  return (seat + 2) % 4; // across
}

/**
 * Apply one Charleston pass. `selections[seat]` must list exactly 3 tile ids the
 * seat is passing. Returns the next state; advances the sequence or moves to
 * play. The orchestrator supplies bot selections.
 */
export function applyCharlestonPass(prev: GameState, selections: Record<number, string[]>): GameState {
  const state = clone(prev);
  if (state.charlestonIndex === undefined) return state;
  const step = CHARLESTON_SEQUENCE[state.charlestonIndex];

  // Pull the 3 chosen tiles out of each seat.
  const outgoing: Record<number, Tile[]> = {};
  for (const p of state.players) {
    const ids = selections[p.seat] ?? [];
    const picked: Tile[] = [];
    for (const id of ids) {
      const i = p.concealed.findIndex((t) => t.id === id);
      if (i >= 0) picked.push(p.concealed.splice(i, 1)[0]);
    }
    outgoing[p.seat] = picked;
  }
  // Deliver to targets.
  for (const p of state.players) {
    const giver = state.players.find((g) => passTarget(g.seat, step.dir) === p.seat)!;
    p.concealed.push(...outgoing[giver.seat]);
  }
  log(state, `Charleston: passed ${step.dir}.`);

  // Advance. After the 3rd pass (end of round 1) the human may stop.
  const next = state.charlestonIndex + 1;
  if (next >= CHARLESTON_SEQUENCE.length || state.charlestonStopped) {
    finishCharleston(state);
  } else if (next === 3 && state.charlestonStopped) {
    finishCharleston(state);
  } else {
    state.charlestonIndex = next;
  }
  return state;
}

/** Mark that the human chose to stop after the first Charleston round. */
export function stopCharleston(prev: GameState): GameState {
  const state = clone(prev);
  finishCharleston(state);
  return state;
}

function finishCharleston(state: GameState) {
  state.charlestonIndex = undefined;
  state.phase = 'play';
  state.currentSeat = state.dealerSeat;
  state.turnState = 'awaitingDiscard';
  log(state, 'Charleston complete — East discards first.');
}

export function charlestonStep(state: GameState): CharlestonStep | undefined {
  return state.charlestonIndex === undefined ? undefined : CHARLESTON_SEQUENCE[state.charlestonIndex];
}

/** Can the human stop the Charleston right now? (only after the first round). */
export function canStopCharleston(state: GameState): boolean {
  return state.charlestonIndex === 3;
}

// --- play: draw / discard --------------------------------------------------

export function drawTile(prev: GameState): GameState {
  const state = clone(prev);
  if (state.turnState !== 'awaitingDraw') return state;
  if (state.wall.length === 0) {
    state.phase = 'result';
    state.result = 'wall';
    log(state, 'The wall is exhausted — wall game (draw).');
    return state;
  }
  const tile = state.wall.shift()!;
  state.players[state.currentSeat].concealed.push(tile);
  state.turnState = 'awaitingDiscard';
  log(state, `${state.players[state.currentSeat].name} draws.`);
  return state;
}

export function discardTile(prev: GameState, seat: number, tileId: string): GameState {
  const state = clone(prev);
  if (state.turnState !== 'awaitingDiscard' || state.currentSeat !== seat) return state;
  const p = state.players[seat];
  const i = p.concealed.findIndex((t) => t.id === tileId);
  if (i < 0) return state;
  const tile = p.concealed.splice(i, 1)[0];
  state.discards.push(tile);
  state.lastDiscard = { tile, seat };
  state.turnState = 'callWindow';
  log(state, `${p.name} discards ${tileLabel(tile)}.`);
  return state;
}

/** Advance to the next seat's draw (called when nobody takes the discard). */
export function passDiscard(prev: GameState): GameState {
  const state = clone(prev);
  if (state.turnState !== 'callWindow' || !state.lastDiscard) return state;
  state.currentSeat = (state.lastDiscard.seat + 1) % 4;
  state.lastDiscard = undefined;
  state.turnState = 'awaitingDraw';
  return state;
}

// --- play: calling a discard ----------------------------------------------

/** Largest exposure size `seat` could legally make from the current discard. */
export function maxExposureCount(state: GameState, seat: number): number {
  const ld = state.lastDiscard;
  if (!ld || ld.seat === seat) return 0;
  if (isJoker(ld.tile)) return 0; // jokers can't be called
  const p = state.players[seat];
  const key = tileKey(ld.tile);
  const naturals = p.concealed.filter((t) => !isJoker(t) && tileKey(t) === key).length;
  const jokers = p.concealed.filter(isJoker).length;
  if (naturals < 2) return 0; // need 2 matches to call
  // pung uses called + 2 naturals; jokers/extra naturals can extend to 5.
  const extra = naturals - 2 + jokers;
  return Math.min(5, 3 + extra);
}

/**
 * `seat` calls the current discard to make an exposure of `count` tiles
 * (3=pung, 4=kong, 5=quint). Consumes the discard + (count-1) tiles from hand,
 * preferring naturals then jokers. It becomes `seat`'s turn to discard.
 */
export function callExposure(prev: GameState, seat: number, count: number): GameState {
  const state = clone(prev);
  const ld = state.lastDiscard;
  if (!ld || state.turnState !== 'callWindow') return state;
  if (count < 3 || count > maxExposureCount(state, seat)) return state;
  const p = state.players[seat];
  const key = tileKey(ld.tile);

  const tiles: Tile[] = [ld.tile];
  // take naturals first
  let need = count - 1;
  for (let n = 0; n < 2; n++) {
    const i = p.concealed.findIndex((t) => !isJoker(t) && tileKey(t) === key);
    if (i >= 0) {
      tiles.push(p.concealed.splice(i, 1)[0]);
      need--;
    }
  }
  // extra naturals
  while (need > 0) {
    const i = p.concealed.findIndex((t) => !isJoker(t) && tileKey(t) === key);
    if (i < 0) break;
    tiles.push(p.concealed.splice(i, 1)[0]);
    need--;
  }
  // pad with jokers
  while (need > 0) {
    const i = p.concealed.findIndex(isJoker);
    if (i < 0) break;
    tiles.push(p.concealed.splice(i, 1)[0]);
    need--;
  }

  p.exposures.push({ tiles, naturalKey: key });
  // The called tile leaves the discard pile.
  state.discards.pop();
  state.lastDiscard = undefined;
  state.currentSeat = seat;
  state.turnState = 'awaitingDiscard';
  log(state, `${p.name} calls ${tileLabel(ld.tile)} for ${exposureName(count)}.`);
  return state;
}

function exposureName(count: number): string {
  return count === 3 ? 'a pung' : count === 4 ? 'a kong' : 'a quint';
}

// --- play: joker exchange --------------------------------------------------

export function jokerExchangeOptions(
  state: GameState,
  seat: number,
): { targetSeat: number; exposureIdx: number; key: string; tileId: string }[] {
  if (state.currentSeat !== seat) return [];
  const p = state.players[seat];
  const opts: { targetSeat: number; exposureIdx: number; key: string; tileId: string }[] = [];
  for (const target of state.players) {
    target.exposures.forEach((exp, idx) => {
      if (!exp.tiles.some(isJoker)) return;
      const tile = p.concealed.find((t) => !isJoker(t) && tileKey(t) === exp.naturalKey);
      if (tile) opts.push({ targetSeat: target.seat, exposureIdx: idx, key: exp.naturalKey, tileId: tile.id });
    });
  }
  return opts;
}

export function jokerExchange(
  prev: GameState,
  seat: number,
  targetSeat: number,
  exposureIdx: number,
  tileId: string,
): GameState {
  const state = clone(prev);
  if (state.currentSeat !== seat) return state;
  const p = state.players[seat];
  const exp = state.players[targetSeat]?.exposures[exposureIdx];
  if (!exp) return state;
  const ti = p.concealed.findIndex((t) => t.id === tileId && tileKey(t) === exp.naturalKey);
  const ji = exp.tiles.findIndex(isJoker);
  if (ti < 0 || ji < 0) return state;
  const natural = p.concealed.splice(ti, 1)[0];
  const joker = exp.tiles[ji];
  exp.tiles[ji] = natural;
  p.concealed.push(joker);
  log(state, `${p.name} swaps a joker for ${tileLabel(natural)}.`);
  return state;
}

// --- win / scoring ---------------------------------------------------------

/** Full 14-tile rack = concealed + every exposed tile. */
export function fullRack(p: Player): Tile[] {
  return [...p.concealed, ...p.exposures.flatMap((e) => e.tiles)];
}

/**
 * Hands a player is allowed to win: concealed-only hands require no exposures.
 */
function allowedHands(state: GameState, p: Player) {
  const concealedOK = p.exposures.length === 0;
  return state.card.hands.filter((h) => concealedOK || !h.concealed);
}

/** Does `seat` currently hold a winning 14-tile hand? */
export function checkWin(state: GameState, seat: number) {
  const p = state.players[seat];
  const rack = fullRack(p);
  return isWinningRack(rack, allowedHands(state, p));
}

/** Could `seat` declare Mahjong by claiming the current discard? */
export function canCallMahjong(state: GameState, seat: number): boolean {
  const ld = state.lastDiscard;
  if (!ld || ld.seat === seat || state.turnState !== 'callWindow') return false;
  const p = state.players[seat];
  const rack = [...fullRack(p), ld.tile];
  if (rack.length !== 14) return false;
  return !!isWinningRack(rack, allowedHands(state, p));
}

export function declareMahjong(prev: GameState, seat: number, fromDiscard: boolean): GameState {
  const state = clone(prev);
  const p = state.players[seat];
  let rack: Tile[];
  if (fromDiscard) {
    const ld = state.lastDiscard;
    if (!ld) return state;
    // Pull the discard into a single-tile "exposure" so the win is auditable.
    rack = [...fullRack(p), ld.tile];
    const win = isWinningRack(rack, allowedHands(state, p));
    if (!win) return state;
    state.discards.pop();
    p.exposures.push({ tiles: [ld.tile], naturalKey: tileKey(ld.tile) });
    state.lastDiscard = undefined;
    state.winner = { seat, handId: win.hand.id, handName: win.hand.name, points: win.hand.points };
  } else {
    const win = checkWin(state, seat);
    if (!win) return state;
    state.winner = { seat, handId: win.hand.id, handName: win.hand.name, points: win.hand.points };
  }
  state.phase = 'result';
  state.result = 'win';
  log(state, `${p.name} declares Mahjong — ${state.winner!.handName} (${state.winner!.points} pts)!`);
  return state;
}

// --- helpers for UI / bots -------------------------------------------------

/** Distance of a seat's current rack to its best hand on the card. */
export function bestHandDistance(state: GameState, seat: number): number {
  const p = state.players[seat];
  const rack = fullRack(p);
  let best = Infinity;
  for (const h of allowedHands(state, p)) best = Math.min(best, matchHand(rack, h).tilesShort);
  return best;
}

export { tileKey, tileLabel, isJoker };
