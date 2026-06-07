import { describe, expect, it } from 'vitest';
import { buildWall, deal, shuffle, tileKey, TOTAL_TILES } from '../src/engine/tiles';

describe('tile set', () => {
  it('builds exactly 152 tiles', () => {
    const wall = buildWall();
    expect(wall).toHaveLength(TOTAL_TILES);
  });

  it('has the correct composition by kind', () => {
    const wall = buildWall();
    const counts = { suit: 0, wind: 0, dragon: 0, flower: 0, joker: 0 };
    for (const t of wall) counts[t.kind]++;
    expect(counts).toEqual({ suit: 108, wind: 16, dragon: 12, flower: 8, joker: 8 });
  });

  it('has exactly 4 of every natural kind and 8 jokers/flowers', () => {
    const wall = buildWall();
    const byKey = new Map<string, number>();
    for (const t of wall) byKey.set(tileKey(t), (byKey.get(tileKey(t)) ?? 0) + 1);
    expect(byKey.get('bam5')).toBe(4);
    expect(byKey.get('dragon-white')).toBe(4);
    expect(byKey.get('wind-N')).toBe(4);
    expect(byKey.get('flower')).toBe(8);
    expect(byKey.get('joker')).toBe(8);
  });

  it('gives unique ids to every tile', () => {
    const wall = buildWall();
    expect(new Set(wall.map((t) => t.id)).size).toBe(TOTAL_TILES);
  });

  it('shuffle is a permutation (same multiset)', () => {
    const wall = buildWall();
    const shuffled = shuffle(wall, mulberry32(42));
    expect(shuffled).toHaveLength(TOTAL_TILES);
    expect(new Set(shuffled.map((t) => t.id))).toEqual(new Set(wall.map((t) => t.id)));
  });

  it('deals 14/13/13/13 and leaves the rest in the wall', () => {
    const wall = buildWall();
    const { hands, wall: rest } = deal(wall);
    expect(hands.map((h) => h.length)).toEqual([14, 13, 13, 13]);
    expect(rest).toHaveLength(TOTAL_TILES - 53);
  });
});

// Deterministic RNG for reproducible tests.
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
