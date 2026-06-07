// llmBot.ts — SCAFFOLD for an LLM-backed opponent. NOT network-wired yet.
//
// The design: on each decision we serialise everything THIS bot is allowed to
// know into a compact JSON `LlmContext`, and we expect the model to return a
// single JSON `LlmAction`. The code never trusts the model blindly — the action
// is validated against the same rules the heuristic bot uses; anything invalid
// falls back to the heuristic. Until an API key is wired in, this class simply
// delegates to the heuristic bot.
//
// When implemented, the call will use the Anthropic Messages API with tool-use
// (structured output) so the JSON action is guaranteed well-formed. A fast model
// is appropriate for low-latency turn decisions; the user supplies their own API
// key in Settings (stored locally, never bundled). No network calls happen now.

import type { Difficulty, GameState } from '../engine/game';
import { fullRack, isJoker, maxExposureCount, tileKey, tileLabel } from '../engine/game';
import { rankHands } from '../engine/matcher';
import { HeuristicBot, type BotStrategy, type CallDecision } from './strategy';

/** The compact, knowledge-limited view handed to the model. */
export interface LlmContext {
  you: number;
  /** Your concealed tiles (labels) — only YOU can see these. */
  hand: string[];
  /** Every player's public exposures. */
  exposures: { seat: number; tiles: string[] }[];
  /** The discard pile in order (public). */
  discards: string[];
  /** The tile currently available to call, if any. */
  callable?: { tile: string; fromSeat: number };
  /** Tiles remaining in the wall (count only — contents are hidden). */
  wallRemaining: number;
  /** The hands on the active card, with the matcher's distance from your rack. */
  cardHands: { id: string; name: string; category: string; points: number; tilesShort: number }[];
  /** What you're legally allowed to do right now. */
  legalActions: string[];
}

/** The JSON the model must return (validated before use). */
export interface LlmAction {
  action: 'discard' | 'call_exposure' | 'call_mahjong' | 'pass' | 'charleston_pass';
  /** For 'discard': a tile label from `hand`. */
  tile?: string;
  /** For 'call_exposure': 3, 4, or 5. */
  count?: number;
  /** For 'charleston_pass': three tile labels from `hand`. */
  tiles?: string[];
  /** Optional model rationale (for the coaching panel / debugging). */
  reasoning?: string;
}

/** Build the context object the model would receive for a decision. */
export function buildLlmContext(state: GameState, seat: number): LlmContext {
  const p = state.players[seat];
  const ranked = rankHands(fullRack(p), state.card.hands);
  const callable = state.lastDiscard && state.lastDiscard.seat !== seat
    ? { tile: tileLabel(state.lastDiscard.tile), fromSeat: state.lastDiscard.seat }
    : undefined;

  const legal: string[] = [];
  if (state.turnState === 'awaitingDiscard' && state.currentSeat === seat) legal.push('discard');
  if (state.turnState === 'callWindow' && callable) {
    legal.push('pass');
    if (maxExposureCount(state, seat) >= 3) legal.push('call_exposure');
    legal.push('call_mahjong'); // validity re-checked by the engine
  }
  if (state.phase === 'charleston') legal.push('charleston_pass');

  return {
    you: seat,
    hand: p.concealed.map(tileLabel),
    exposures: state.players
      .filter((q) => q.exposures.length)
      .map((q) => ({ seat: q.seat, tiles: q.exposures.flatMap((e) => e.tiles.map(tileLabel)) })),
    discards: state.discards.map(tileLabel),
    callable,
    wallRemaining: state.wall.length,
    cardHands: ranked.map((r) => ({
      id: r.hand.id,
      name: r.hand.name,
      category: r.hand.category,
      points: r.hand.points,
      tilesShort: r.tilesShort,
    })),
    legalActions: legal,
  };
}

/**
 * LLM-backed strategy. Currently a scaffold: builds the context (exposed for
 * future wiring / debugging) and delegates every decision to the heuristic bot.
 */
/**
 * Future integration point: turn an LlmContext into an action via the Anthropic
 * Messages API (tool-use / structured output). Returns null today so callers use
 * the heuristic fallback — no network or API key is wired in this build.
 */
export async function queryLlm(_ctx: LlmContext): Promise<LlmAction | null> {
  return null;
}

export class LlmBot implements BotStrategy {
  private fallback: HeuristicBot;
  constructor(_difficulty: Difficulty = 'llm') {
    this.fallback = new HeuristicBot('medium');
  }

  chooseCharlestonPass(state: GameState, seat: number): string[] {
    return this.fallback.chooseCharlestonPass(state, seat);
  }
  chooseDiscard(state: GameState, seat: number): string {
    return this.fallback.chooseDiscard(state, seat);
  }
  decideCall(state: GameState, seat: number): CallDecision {
    return this.fallback.decideCall(state, seat);
  }
}

/** Map an LLM tile label back to a concrete concealed tile id (first match). */
export function resolveTileByLabel(state: GameState, seat: number, label: string): string | undefined {
  const p = state.players[seat];
  const want = label.toLowerCase();
  const match = p.concealed.find(
    (t) => tileLabel(t).toLowerCase() === want || (want === 'joker' && isJoker(t)) || tileKey(t) === want,
  );
  return match?.id;
}
