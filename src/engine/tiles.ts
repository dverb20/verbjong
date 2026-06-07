// The American Mahjong (NMJL) tile set: 152 tiles total.
//   - 3 suits (bam / crak / dot), ranks 1-9, x4  = 108
//   - 4 winds (N / E / S / W), x4                =  16
//   - 3 dragons (red / green / white-"soap"), x4 =  12
//   - flowers, x8                                =   8
//   - jokers, x8                                 =   8
//                                          total = 152

export type Suit = 'bam' | 'crak' | 'dot';
export type Wind = 'N' | 'E' | 'S' | 'W';
// Dragons are colour-bound to suits in American play:
//   red   <-> crak,  green <-> bam,  white ("soap", also stands in for 0) <-> dot
export type Dragon = 'red' | 'green' | 'white';

export type TileKind = 'suit' | 'wind' | 'dragon' | 'flower' | 'joker';

export interface Tile {
  /** Stable unique id for React keys & equality of physical tiles. */
  id: string;
  kind: TileKind;
  suit?: Suit;
  rank?: number; // 1-9 for suit tiles
  wind?: Wind;
  dragon?: Dragon;
}

export const SUITS: Suit[] = ['bam', 'crak', 'dot'];
export const WINDS: Wind[] = ['N', 'E', 'S', 'W'];
export const DRAGONS: Dragon[] = ['red', 'green', 'white'];

/** Which dragon belongs to which suit (and vice-versa). */
export const DRAGON_OF_SUIT: Record<Suit, Dragon> = {
  crak: 'red',
  bam: 'green',
  dot: 'white',
};
export const SUIT_OF_DRAGON: Record<Dragon, Suit> = {
  red: 'crak',
  green: 'bam',
  white: 'dot',
};

/**
 * A "kind key" identifies the *type* of a tile, ignoring which of the 4 copies
 * it is. Two tiles match (for pungs/kongs, exposures, etc.) iff their kind keys
 * are equal. Jokers are deliberately excluded from this notion.
 */
export function tileKey(t: Tile): string {
  switch (t.kind) {
    case 'suit':
      return `${t.suit}${t.rank}`;
    case 'wind':
      return `wind-${t.wind}`;
    case 'dragon':
      return `dragon-${t.dragon}`;
    case 'flower':
      return 'flower';
    case 'joker':
      return 'joker';
  }
}

export function isJoker(t: Tile): boolean {
  return t.kind === 'joker';
}

/** Build the full, ordered 152-tile wall (un-shuffled). */
export function buildWall(): Tile[] {
  const tiles: Tile[] = [];
  let n = 0;
  const push = (base: Omit<Tile, 'id'>) => {
    tiles.push({ ...base, id: `t${n++}` });
  };

  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) push({ kind: 'suit', suit, rank });
    }
  }
  for (const wind of WINDS) {
    for (let copy = 0; copy < 4; copy++) push({ kind: 'wind', wind });
  }
  for (const dragon of DRAGONS) {
    for (let copy = 0; copy < 4; copy++) push({ kind: 'dragon', dragon });
  }
  for (let copy = 0; copy < 8; copy++) push({ kind: 'flower' });
  for (let copy = 0; copy < 8; copy++) push({ kind: 'joker' });

  return tiles;
}

export const TOTAL_TILES = 152;

/**
 * Fisher-Yates shuffle. Accepts an injectable RNG so games are reproducible in
 * tests; defaults to Math.random.
 */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deal an American Mahjong game: 4 players, 13 tiles each except the dealer
 * (East / seat 0) who receives 14. Returns the hands plus the remaining wall.
 */
export function deal(wall: Tile[]): { hands: Tile[][]; wall: Tile[] } {
  const hands: Tile[][] = [[], [], [], []];
  let idx = 0;
  for (let seat = 0; seat < 4; seat++) {
    const count = seat === 0 ? 14 : 13;
    hands[seat] = wall.slice(idx, idx + count);
    idx += count;
  }
  return { hands, wall: wall.slice(idx) };
}

/** Human-friendly short label, e.g. "3B", "Red", "Soap", "F", "Joker", "N". */
export function tileLabel(t: Tile): string {
  switch (t.kind) {
    case 'suit':
      return `${t.rank}${t.suit === 'bam' ? 'B' : t.suit === 'crak' ? 'C' : 'D'}`;
    case 'wind':
      return t.wind!;
    case 'dragon':
      return t.dragon === 'red' ? 'Red' : t.dragon === 'green' ? 'Green' : 'Soap';
    case 'flower':
      return 'F';
    case 'joker':
      return 'Joker';
  }
}
