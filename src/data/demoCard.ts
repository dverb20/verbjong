// demoCard.ts — an ORIGINAL practice card (NOT the copyrighted NMJL card).
//
// These hands are our own invention, designed to exercise every part of the
// engine (runs, like-numbers, evens/odds, winds & dragons, the Year family,
// singles-and-pairs with no jokers, and quints that force joker use). Users can
// enter the hands from a card they personally own via the in-app Card Editor.

import type { Group, Hand, MahjongCard } from '../engine/cardSchema';
import { yearDigits } from '../engine/cardSchema';

// --- tiny builders to keep the hand definitions readable -------------------
const num = (count: number, suitRef: string, numberRef: Group['numberRef']): Group => ({
  count,
  role: 'number',
  suitRef,
  numberRef,
});
const flower = (count: number): Group => ({ count, role: 'flower' });
const soap = (count: number): Group => ({ count, role: 'soap' });
const wind = (count: number, w: Group['wind']): Group => ({ count, role: 'wind', wind: w });
const dragon = (count: number, suitRef?: string, d?: Group['dragon']): Group => ({
  count,
  role: 'dragon',
  suitRef,
  dragon: d,
});

/** A year written in one suit, e.g. 2026 -> [2, soap, 2, 6] singles in suitRef. */
function yearGroups(year: number, suitRef: string): Group[] {
  return yearDigits(year).map((d) => ({ count: 1, role: 'yearDigit', digit: d, suitRef }) as Group);
}

export function buildDemoCard(year: number): MahjongCard {
  const hands: Hand[] = [
    {
      id: 'year-1',
      category: 'Year',
      name: `FFFF ${year} ${year}`,
      groups: [flower(4), ...yearGroups(year, 'A'), ...yearGroups(year, 'B'), dragon(2, undefined, 'red')],
      distinctSuits: 2,
      concealed: false,
      points: 25,
      note: 'Four flowers, the year in two different suits, pair of red dragons.',
    },
    {
      id: 'likenum-1',
      category: 'Like Numbers',
      name: 'NNNN NNNN NNNN FF (3 suits)',
      groups: [num(4, 'A', 'n'), num(4, 'B', 'n'), num(4, 'C', 'n'), flower(2)],
      distinctSuits: 3,
      concealed: false,
      points: 25,
      note: 'Any single number as a kong in all three suits, plus a pair of flowers.',
    },
    {
      id: 'likenum-2',
      category: 'Like Numbers',
      name: 'NNN NNN NNN DDD DD',
      groups: [num(3, 'A', 'n'), num(3, 'B', 'n'), num(3, 'C', 'n'), dragon(3, 'A'), dragon(2, 'B')],
      distinctSuits: 3,
      concealed: false,
      points: 30,
    },
    {
      id: 'run-1',
      category: 'Consecutive Run',
      name: 'NNNN (N+1)(N+1)(N+1)(N+1) (N+2)(N+2)(N+2)(N+2) FF (1 suit)',
      groups: [num(4, 'A', 'n'), num(4, 'A', 'n+1'), num(4, 'A', 'n+2'), flower(2)],
      distinctSuits: 1,
      concealed: false,
      points: 25,
      note: 'Three consecutive kongs in one suit + flowers.',
    },
    {
      id: 'run-2',
      category: 'Consecutive Run',
      name: 'NNN (N+1)(N+1)(N+1) — two suits — FF FF',
      groups: [
        num(3, 'A', 'n'),
        num(3, 'A', 'n+1'),
        num(3, 'B', 'n'),
        num(3, 'B', 'n+1'),
        flower(2),
      ],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },
    {
      id: 'even-1',
      category: '2468',
      name: '2222 4444 6666 88 (1 suit)',
      groups: [num(4, 'A', 2), num(4, 'A', 4), num(4, 'A', 6), num(2, 'A', 8)],
      distinctSuits: 1,
      concealed: false,
      points: 25,
    },
    {
      id: 'odd-1',
      category: '13579',
      name: '111 333 555 777 99 (1 suit)',
      groups: [num(3, 'A', 1), num(3, 'A', 3), num(3, 'A', 5), num(3, 'A', 7), num(2, 'A', 9)],
      distinctSuits: 1,
      concealed: false,
      points: 25,
    },
    {
      id: 'winds-1',
      category: 'Winds-Dragons',
      name: 'NNN EEE WWW SSS DD',
      groups: [wind(3, 'N'), wind(3, 'E'), wind(3, 'W'), wind(3, 'S'), soap(2)],
      distinctSuits: 0,
      concealed: false,
      points: 30,
      note: 'A pung of each wind plus a pair of soap (white dragon).',
    },
    {
      id: 'winds-2',
      category: 'Winds-Dragons',
      name: 'Red×4 Green×4 Soap×4 FF',
      groups: [dragon(4, undefined, 'red'), dragon(4, undefined, 'green'), soap(4), flower(2)],
      distinctSuits: 0,
      concealed: false,
      points: 30,
    },
    {
      id: 'sp-1',
      category: 'Singles and Pairs',
      name: 'NN (N+1)(N+1) (N+2)(N+2) (N+3)(N+3) — 2 suits',
      groups: [
        num(2, 'A', 'n'),
        num(2, 'A', 'n+1'),
        num(2, 'A', 'n+2'),
        num(2, 'A', 'n+3'),
        num(2, 'B', 'n'),
        num(2, 'B', 'n+1'),
        num(2, 'B', 'n+2'),
      ],
      distinctSuits: 2,
      concealed: true,
      points: 50,
      note: 'Concealed. No jokers — every group is a pair.',
    },
    {
      id: 'quint-1',
      category: 'Quints',
      name: 'NNNNN NNNNN NNNN (3 suits)',
      groups: [num(5, 'A', 'n'), num(5, 'B', 'n'), num(4, 'C', 'n')],
      distinctSuits: 3,
      concealed: false,
      points: 45,
      note: 'Quints require jokers — only four of each tile exist.',
    },
  ];

  return {
    year,
    name: `Verbjong Demo Card ${year}`,
    hands,
    isDemo: true,
  };
}
