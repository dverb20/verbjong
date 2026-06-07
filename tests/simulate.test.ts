import { describe, expect, it } from 'vitest';
import { buildDemoCard } from '../src/data/demoCard';
import { makeBot } from '../src/bots/strategy';
import {
  callExposure,
  canCallMahjong,
  checkWin,
  createGame,
  declareMahjong,
  discardTile,
  drawTile,
  type GameState,
  applyCharlestonPass,
} from '../src/engine/game';

// Deterministic RNG so the whole simulation is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const card = buildDemoCard(2026);
const bot = makeBot('medium'); // deterministic; drives all four seats

/** Headless mirror of the store's orchestration — plays one game to completion. */
function playGame(seed: number, charleston: boolean): GameState {
  let g = createGame({
    year: 2026,
    card,
    botDifficulty: 'medium',
    charlestonEnabled: charleston,
    rng: mulberry32(seed),
  });

  while (g.phase === 'charleston') {
    const selections: Record<number, string[]> = {};
    for (const p of g.players) selections[p.seat] = bot.chooseCharlestonPass(g, p.seat);
    g = applyCharlestonPass(g, selections);
  }

  let guard = 0;
  while (g.phase === 'play' && guard++ < 5000) {
    if (g.turnState === 'awaitingDraw') {
      g = drawTile(g);
      continue;
    }
    if (g.turnState === 'awaitingDiscard') {
      const seat = g.currentSeat;
      if (checkWin(g, seat)) {
        g = declareMahjong(g, seat, false);
        continue;
      }
      g = discardTile(g, seat, bot.chooseDiscard(g, seat));
      continue;
    }
    // callWindow: mahjong (closest) > exposure (closest) > pass
    const from = g.lastDiscard!.seat;
    let acted = false;
    for (let off = 1; off <= 3 && !acted; off++) {
      const seat = (from + off) % 4;
      if (canCallMahjong(g, seat)) {
        g = declareMahjong(g, seat, true);
        acted = true;
      }
    }
    if (acted) continue;
    for (let off = 1; off <= 3 && !acted; off++) {
      const seat = (from + off) % 4;
      const decision = bot.decideCall(g, seat);
      if (decision.type === 'exposure') {
        g = callExposure(g, seat, decision.count);
        acted = true;
      }
    }
    if (!acted) {
      // nobody called — advance to the next seat's draw
      g.currentSeat = (from + 1) % 4;
      g.lastDiscard = undefined;
      g.turnState = 'awaitingDraw';
    }
  }
  return g;
}

describe('full-game simulation', () => {
  it('every game terminates in a win or a wall game (no deadlocks)', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const g = playGame(seed, seed % 2 === 0);
      expect(g.phase).toBe('result');
      expect(g.result === 'win' || g.result === 'wall').toBe(true);
      // tile conservation: 152 tiles always accounted for
      const total =
        g.wall.length +
        g.discards.length +
        g.players.reduce((s, p) => s + p.concealed.length + p.exposures.reduce((x, e) => x + e.tiles.length, 0), 0);
      expect(total).toBe(152);
    }
  });

  it('the win path is reachable in real play (some games are won)', () => {
    let wins = 0;
    for (let seed = 1; seed <= 24; seed++) {
      if (playGame(seed, false).result === 'win') wins++;
    }
    expect(wins).toBeGreaterThan(0);
  });
});
