// demoCard.ts — an ORIGINAL practice card (NOT the copyrighted NMJL card).
//
// These hands are our own invention, written to give a full, varied solo workout
// across every family the engine understands: Year, Like Numbers, Consecutive
// Run, 2468 (evens), 13579 (odds), Winds & Dragons, Singles & Pairs (no jokers),
// and Quints (which force joker use). Every hand totals 14 tiles.

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
    // ---- Year --------------------------------------------------------------
    {
      id: 'year-1',
      category: 'Year',
      name: `FFFF ${year} ${year}`,
      groups: [flower(4), ...yearGroups(year, 'A'), ...yearGroups(year, 'B'), dragon(2, undefined, 'red')],
      distinctSuits: 2,
      concealed: false,
      points: 25,
      note: 'Four flowers, the year in two different suits, and a pair of red dragons.',
    },
    {
      id: 'year-2',
      category: 'Year',
      name: `${year} DDD DDD FFFF`,
      groups: [...yearGroups(year, 'A'), dragon(3, 'A'), dragon(3, 'B'), flower(4)],
      distinctSuits: 2,
      concealed: false,
      points: 30,
      note: 'The year in one suit, a pung of its matching dragon, a pung of another, four flowers.',
    },

    // ---- Like Numbers ------------------------------------------------------
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
      id: 'likenum-3',
      category: 'Like Numbers',
      name: 'NNNN NNNN DD DD FF (2 suits)',
      groups: [num(4, 'A', 'n'), num(4, 'B', 'n'), dragon(2, 'A'), dragon(2, 'B'), flower(2)],
      distinctSuits: 2,
      concealed: false,
      points: 25,
    },

    // ---- Consecutive Run ---------------------------------------------------
    {
      id: 'run-1',
      category: 'Consecutive Run',
      name: 'NNNN (N+1)x4 (N+2)x4 FF (1 suit)',
      groups: [num(4, 'A', 'n'), num(4, 'A', 'n+1'), num(4, 'A', 'n+2'), flower(2)],
      distinctSuits: 1,
      concealed: false,
      points: 25,
      note: 'Three consecutive kongs in one suit, plus flowers.',
    },
    {
      id: 'run-2',
      category: 'Consecutive Run',
      name: 'NNN (N+1)(N+1)(N+1) — 2 suits — FF',
      groups: [num(3, 'A', 'n'), num(3, 'A', 'n+1'), num(3, 'B', 'n'), num(3, 'B', 'n+1'), flower(2)],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },
    {
      id: 'run-3',
      category: 'Consecutive Run',
      name: 'NNNN (N+1)x4 — NNN (N+1)x3 (2 suits)',
      groups: [num(4, 'A', 'n'), num(4, 'A', 'n+1'), num(3, 'B', 'n'), num(3, 'B', 'n+1')],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },

    // ---- 2468 (evens) ------------------------------------------------------
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
      id: 'even-2',
      category: '2468',
      name: '222 444 666 888 DD (2 suits)',
      groups: [num(3, 'A', 2), num(3, 'A', 4), num(3, 'B', 6), num(3, 'B', 8), soap(2)],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },
    {
      id: 'even-3',
      category: '2468',
      name: '2222 4444 6666 88 (2 suits)',
      groups: [num(4, 'A', 2), num(4, 'A', 4), num(4, 'B', 6), num(2, 'B', 8)],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },

    // ---- 13579 (odds) ------------------------------------------------------
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
      id: 'odd-2',
      category: '13579',
      name: '111 333 555 777 99 (2 suits)',
      groups: [num(3, 'A', 1), num(3, 'A', 3), num(3, 'A', 5), num(3, 'B', 7), num(2, 'B', 9)],
      distinctSuits: 2,
      concealed: false,
      points: 30,
    },

    // ---- Winds & Dragons ---------------------------------------------------
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
      id: 'winds-3',
      category: 'Winds-Dragons',
      name: 'NNNN SSSS Red×3 Green×3',
      groups: [wind(4, 'N'), wind(4, 'S'), dragon(3, undefined, 'red'), dragon(3, undefined, 'green')],
      distinctSuits: 0,
      concealed: false,
      points: 35,
    },
    {
      id: 'winds-pairs',
      category: 'Winds-Dragons',
      name: 'NN EE WW SS + Red Green Soap (pairs)',
      groups: [
        wind(2, 'N'),
        wind(2, 'E'),
        wind(2, 'W'),
        wind(2, 'S'),
        dragon(2, undefined, 'red'),
        dragon(2, undefined, 'green'),
        soap(2),
      ],
      distinctSuits: 0,
      concealed: true,
      points: 50,
      note: 'Concealed, no jokers — a pair of every wind and every dragon.',
    },

    // ---- Singles and Pairs (no jokers) ------------------------------------
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
      id: 'sp-2',
      category: 'Singles and Pairs',
      name: 'NN (N+1)(N+1) — three suits — FF',
      groups: [
        num(2, 'A', 'n'),
        num(2, 'A', 'n+1'),
        num(2, 'B', 'n'),
        num(2, 'B', 'n+1'),
        num(2, 'C', 'n'),
        num(2, 'C', 'n+1'),
        flower(2),
      ],
      distinctSuits: 3,
      concealed: true,
      points: 50,
    },

    // ---- Quints (force joker use) -----------------------------------------
    {
      id: 'quint-1',
      category: 'Quints',
      name: 'NNNNN NNNNN NNNN (3 suits)',
      groups: [num(5, 'A', 'n'), num(5, 'B', 'n'), num(4, 'C', 'n')],
      distinctSuits: 3,
      concealed: false,
      points: 45,
      note: 'Quints need jokers — only four of each tile exist.',
    },
    {
      id: 'quint-2',
      category: 'Quints',
      name: 'NNNNN NNNN NNN FF (3 suits)',
      groups: [num(5, 'A', 'n'), num(4, 'B', 'n'), num(3, 'C', 'n'), flower(2)],
      distinctSuits: 3,
      concealed: false,
      points: 45,
    },
  ];

  return {
    year,
    name: `Verbjong Practice Card ${year}`,
    hands,
    isDemo: true,
  };
}
