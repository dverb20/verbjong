// cards.ts — the year-slot card library, persisted in localStorage.
//
// Years 2021..2026 are each backed by a card. By default every slot maps to our
// ORIGINAL demo card built for that year (so the game is instantly playable and
// the Year hands use the right digits). Users can edit/import their own hands per
// year via the Card Editor; those overrides are saved locally and take priority.
//
// We never ship the copyrighted NMJL hands.

import type { MahjongCard } from '../engine/cardSchema';
import { buildDemoCard } from './demoCard';

export const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021] as const;
export type AvailableYear = (typeof AVAILABLE_YEARS)[number];

const STORAGE_KEY = 'verbjong.cards.v1';

type CardOverrides = Record<number, MahjongCard>;

function loadOverrides(): CardOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CardOverrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: CardOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* storage unavailable — overrides simply won't persist */
  }
}

/** The active card for a year: a user override if present, else the demo card. */
export function getCard(year: number): MahjongCard {
  const overrides = loadOverrides();
  return overrides[year] ?? buildDemoCard(year);
}

/** Save a user-edited card for a year (marks it non-demo). */
export function saveCard(year: number, card: MahjongCard) {
  const overrides = loadOverrides();
  overrides[year] = { ...card, year, isDemo: false };
  saveOverrides(overrides);
}

/** Remove a user override, reverting the year to the built-in demo card. */
export function resetCard(year: number) {
  const overrides = loadOverrides();
  delete overrides[year];
  saveOverrides(overrides);
}

export function hasOverride(year: number): boolean {
  return year in loadOverrides();
}

/** Export a year's card as pretty JSON for sharing/backup. */
export function exportCardJson(year: number): string {
  return JSON.stringify(getCard(year), null, 2);
}

/** Import a card from a JSON string; returns the parsed card or throws. */
export function importCardJson(year: number, json: string): MahjongCard {
  const parsed = JSON.parse(json) as MahjongCard;
  if (!parsed || !Array.isArray(parsed.hands)) throw new Error('Invalid card: missing hands[]');
  saveCard(year, parsed);
  return getCard(year);
}
