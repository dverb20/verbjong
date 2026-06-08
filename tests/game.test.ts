import { describe, expect, it } from 'vitest';
import { buildDemoCard } from '../src/data/demoCard';
import {
  callExposure,
  canCallMahjong,
  checkWin,
  createGame,
  declareMahjong,
  discardTile,
  drawTile,
  legalExposureCounts,
  maxExposureCount,
  passDiscard,
} from '../src/engine/game';
import type { Tile } from '../src/engine/tiles';

let idc = 0;
function t(tok: string): Tile {
  idc++;
  const id = `g${idc}`;
  if (tok === 'F') return { id, kind: 'flower' };
  if (tok === 'J') return { id, kind: 'joker' };
  if (['N', 'E', 'S', 'W'].includes(tok)) return { id, kind: 'wind', wind: tok as any };
  if (tok === 'soap') return { id, kind: 'dragon', dragon: 'white' };
  const rank = Number(tok[0]);
  const suit = tok[1] === 'B' ? 'bam' : tok[1] === 'C' ? 'crak' : 'dot';
  return { id, kind: 'suit', suit, rank };
}
function tiles(spec: string): Tile[] {
  const out: Tile[] = [];
  for (const part of spec.trim().split(/\s+/)) {
    const m = part.match(/^(.+)\*(\d+)$/);
    if (m) for (let i = 0; i < Number(m[2]); i++) out.push(t(m[1]));
    else out.push(t(part));
  }
  return out;
}

const card = buildDemoCard(2026);

function freshGame() {
  return createGame({ year: 2026, card, botDifficulty: 'medium', charlestonEnabled: false });
}

describe('setup', () => {
  it('deals 14/13/13/13 and starts with East discarding', () => {
    const g = freshGame();
    expect(g.players.map((p) => p.concealed.length)).toEqual([14, 13, 13, 13]);
    expect(g.phase).toBe('play');
    expect(g.currentSeat).toBe(0);
    expect(g.turnState).toBe('awaitingDiscard');
  });
});

describe('discard / pass / draw loop', () => {
  it('advances to the next seat after a passed discard', () => {
    let g = freshGame();
    const toss = g.players[0].concealed[0].id;
    g = discardTile(g, 0, toss);
    expect(g.turnState).toBe('callWindow');
    expect(g.lastDiscard?.tile.id).toBe(toss);
    g = passDiscard(g);
    expect(g.currentSeat).toBe(1);
    expect(g.turnState).toBe('awaitingDraw');
    const before = g.players[1].concealed.length;
    g = drawTile(g);
    expect(g.players[1].concealed.length).toBe(before + 1);
    expect(g.turnState).toBe('awaitingDiscard');
  });
});

describe('calling an exposure', () => {
  it('lets a seat call a discard for a pung and take the turn', () => {
    let g = freshGame();
    // Force a known discard from seat 0 and matching tiles in seat 1.
    g.players[1].concealed = tiles('5B 5B 1C 2C 3C 4D 6D 7D 8D 9D N E W');
    const five = t('5B');
    g.players[0].concealed.unshift(five);
    g = discardTile(g, 0, five.id);
    expect(maxExposureCount(g, 1)).toBeGreaterThanOrEqual(3);
    g = callExposure(g, 1, 3);
    expect(g.currentSeat).toBe(1);
    expect(g.turnState).toBe('awaitingDiscard');
    expect(g.players[1].exposures).toHaveLength(1);
    expect(g.players[1].exposures[0].tiles).toHaveLength(3);
    // the called tile left the discard pile
    expect(g.discards.find((d) => d.id === five.id)).toBeUndefined();
  });

  it('cannot call with no matching natural tile', () => {
    let g = freshGame();
    g.players[1].concealed = tiles('5B 1C 2C 3C 4D 6D 7D 8D 9D N E W S');
    const five = t('5B');
    g.players[0].concealed.unshift(five);
    g = discardTile(g, 0, five.id);
    expect(maxExposureCount(g, 1)).toBe(0); // only one 5B, no joker
  });

  it('can call with one matching tile plus a joker (pung with a joker)', () => {
    let g = freshGame();
    g.players[1].concealed = tiles('5B J 1C 2C 3C 4D 6D 7D 8D 9D N E W');
    const five = t('5B');
    g.players[0].concealed.unshift(five);
    g = discardTile(g, 0, five.id);
    expect(maxExposureCount(g, 1)).toBeGreaterThanOrEqual(3);
    g = callExposure(g, 1, 3);
    expect(g.players[1].exposures).toHaveLength(1);
    expect(g.players[1].exposures[0].tiles).toHaveLength(3);
    expect(g.players[1].exposures[0].tiles.some((x) => x.kind === 'joker')).toBe(true);
  });
});

describe('exposure legality against the card', () => {
  it('rejects a 5 in a different suit after exposing 3s (no odd hand allows it)', () => {
    let g = freshGame();
    g.players[1].exposures = [{ tiles: tiles('3B 3B 3B'), naturalKey: 'bam3' }];
    g.players[1].concealed = tiles('5C 5C 1D 2D 4D 6D 7D 8D 9D N');
    const fiveC = t('5C');
    g.players[0].concealed.unshift(fiveC);
    g = discardTile(g, 0, fiveC.id);
    expect(legalExposureCounts(g, 1)).toEqual([]); // 3-bam + 5-crak fit no hand
    // and the engine refuses the illegal call
    const before = g.players[1].exposures.length;
    g = callExposure(g, 1, 3);
    expect(g.players[1].exposures.length).toBe(before);
  });

  it('allows a 5 in the SAME suit after exposing 3s (one-suit odds)', () => {
    let g = freshGame();
    g.players[1].exposures = [{ tiles: tiles('3B 3B 3B'), naturalKey: 'bam3' }];
    g.players[1].concealed = tiles('5B 5B 1D 2D 4D 6D 7D 8D 9D N');
    const fiveB = t('5B');
    g.players[0].concealed.unshift(fiveB);
    g = discardTile(g, 0, fiveB.id);
    expect(legalExposureCounts(g, 1)).toContain(3);
  });
});

describe('win detection', () => {
  it('detects a self-drawn winning hand', () => {
    const g = freshGame();
    g.players[0].concealed = tiles('5B*4 5C*4 5D*4 F*2'); // likenum-1
    expect(checkWin(g, 0)?.hand.id).toBe('likenum-1');
  });

  it('declares Mahjong off a discard for the final tile', () => {
    let g = freshGame();
    // seat 0 will discard the 14th tile that completes seat 2's hand
    g.players[2].concealed = tiles('2B*4 4B*4 6B*4 8B'); // needs one more 8B (even-1)
    const win = t('8B');
    g.players[0].concealed.unshift(win);
    g = discardTile(g, 0, win.id);
    expect(canCallMahjong(g, 2)).toBe(true);
    g = declareMahjong(g, 2, true);
    expect(g.phase).toBe('result');
    expect(g.result).toBe('win');
    expect(g.winner?.seat).toBe(2);
    expect(g.winner?.handId).toBe('even-1');
  });

  it('blocks a concealed hand once a player has exposed', () => {
    const g = freshGame();
    // sp-1 is concealed; give the rack but also an exposure -> not allowed
    g.players[0].concealed = tiles('1B*2 2B*2 3B*2 4B*2 1C*2 2C');
    g.players[0].exposures = [{ tiles: tiles('2C 2C'), naturalKey: 'crak2' }];
    // full rack matches sp-1 tiles but concealed hand is disallowed after exposure
    expect(checkWin(g, 0)).toBeUndefined();
  });
});
