import { describe, expect, it } from 'vitest';
import type { Tile } from '../src/engine/tiles';
import { buildDemoCard } from '../src/data/demoCard';
import { findBestHand, isWinningRack, matchHand } from '../src/engine/matcher';

let idc = 0;
/** Parse a compact token into a Tile. e.g. "5B" "soap" "red" "N" "F" "J". */
function tile(tok: string): Tile {
  idc++;
  const id = `x${idc}`;
  if (tok === 'F') return { id, kind: 'flower' };
  if (tok === 'J') return { id, kind: 'joker' };
  if (['N', 'E', 'S', 'W'].includes(tok)) return { id, kind: 'wind', wind: tok as any };
  if (tok === 'red') return { id, kind: 'dragon', dragon: 'red' };
  if (tok === 'green') return { id, kind: 'dragon', dragon: 'green' };
  if (tok === 'soap') return { id, kind: 'dragon', dragon: 'white' };
  const rank = Number(tok[0]);
  const suit = tok[1] === 'B' ? 'bam' : tok[1] === 'C' ? 'crak' : 'dot';
  return { id, kind: 'suit', suit, rank };
}
/** Build a rack from tokens; "5B*4" repeats a token. */
function rack(spec: string): Tile[] {
  const out: Tile[] = [];
  for (const part of spec.trim().split(/\s+/)) {
    const m = part.match(/^(.+)\*(\d+)$/);
    if (m) for (let i = 0; i < Number(m[2]); i++) out.push(tile(m[1]));
    else out.push(tile(part));
  }
  return out;
}

const card = buildDemoCard(2026);
const hand = (id: string) => card.hands.find((h) => h.id === id)!;

describe('matchHand — completion', () => {
  it('completes an evens hand (2222 4444 6666 88, one suit)', () => {
    const r = rack('2B*4 4B*4 6B*4 8B*2');
    expect(matchHand(r, hand('even-1')).isComplete).toBe(true);
  });

  it('lets a joker fill a kong slot', () => {
    const r = rack('2B*3 J 4B*4 6B*4 8B*2');
    expect(matchHand(r, hand('even-1')).isComplete).toBe(true);
  });

  it('completes like-numbers across three suits', () => {
    const r = rack('5B*4 5C*4 5D*4 F*2');
    expect(matchHand(r, hand('likenum-1')).isComplete).toBe(true);
  });

  it('completes a quint hand only with jokers (4 copies exist)', () => {
    const r = rack('3B*4 J 3C*4 J 3D*4');
    expect(matchHand(r, hand('quint-1')).isComplete).toBe(true);
  });

  it('completes winds & dragons (no suit)', () => {
    const r = rack('N*3 E*3 W*3 S*3 soap*2');
    expect(matchHand(r, hand('winds-1')).isComplete).toBe(true);
  });

  it('completes a consecutive run in one suit (n=2)', () => {
    const r = rack('2D*4 3D*4 4D*4 F*2');
    expect(matchHand(r, hand('run-1')).isComplete).toBe(true);
  });

  it('completes the Year hand for 2026 in two suits', () => {
    const r = rack('F*4 2B 2B 6B soap 2C 2C 6C soap red red');
    expect(matchHand(r, hand('year-1')).isComplete).toBe(true);
  });
});

describe('matchHand — jokers cannot fill singles/pairs', () => {
  it('a joker cannot complete a pair in a singles-and-pairs hand', () => {
    // one 4B short, with a joker present: still 1 tile short (pairs reject jokers)
    const r = rack('1B*2 2B*2 3B*2 4B J 1C*2 2C*2 3C*2');
    const res = matchHand(r, hand('sp-1'));
    expect(res.isComplete).toBe(false);
    expect(res.tilesShort).toBe(1);
  });

  it('completes the same hand with the real pair tile', () => {
    const r = rack('1B*2 2B*2 3B*2 4B*2 1C*2 2C*2 3C*2');
    expect(matchHand(r, hand('sp-1')).isComplete).toBe(true);
  });
});

describe('distance', () => {
  it('a 13-tile rack is at least 1 tile short', () => {
    const r = rack('2B*4 4B*4 6B*4 8B'); // missing one 8B
    const res = matchHand(r, hand('even-1'));
    expect(res.isComplete).toBe(false);
    expect(res.tilesShort).toBe(1);
  });

  it('finds the closest hand on the card', () => {
    // A near-complete evens rack should rank even-1 best.
    const r = rack('2B*4 4B*4 6B*4 8B');
    const best = findBestHand(r, card.hands)!;
    expect(best.hand.id).toBe('even-1');
    expect(best.tilesShort).toBe(1);
  });
});

describe('isWinningRack', () => {
  it('returns the matching hand for a complete rack', () => {
    const r = rack('5B*4 5C*4 5D*4 F*2');
    const win = isWinningRack(r, card.hands);
    expect(win?.hand.id).toBe('likenum-1');
  });

  it('returns undefined for a non-winning 14-tile rack', () => {
    const r = rack('1B 2B 3C 4D 5B 6C 7D 8B 9C N E W S');
    expect(isWinningRack(r, card.hands)).toBeUndefined();
  });
});
