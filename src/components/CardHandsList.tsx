// CardHandsList.tsx — the scrollable, category-grouped list of a card's hands.
// Shared by the full Card Viewer screen and the in-game card overlay.

import { useMemo } from 'react';
import type { Hand, MahjongCard } from '../engine/cardSchema';
import { HandPattern } from './HandPattern';

export function CardHandsList({ card }: { card: MahjongCard }) {
  const byCategory = useMemo(() => {
    const map = new Map<string, Hand[]>();
    for (const h of card.hands) {
      const arr = map.get(h.category) ?? [];
      arr.push(h);
      map.set(h.category, arr);
    }
    return [...map.entries()];
  }, [card]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-sumi-soft leading-relaxed">
        Colours show how many different suits a hand needs.{' '}
        <span className="font-semibold text-sakura-deep">Pink</span>,{' '}
        <span className="font-semibold text-sora-deep">blue</span> and{' '}
        <span className="font-semibold text-matcha-deep">green</span> are three different suits. “N”
        means any number; “N+1” the next one up. Jokers work only in groups of three or more.
      </p>
      {byCategory.map(([cat, hands]) => (
        <section key={cat} className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-koi-deep font-bold border-b border-washi-deep pb-1">
            {cat}
          </h3>
          {hands.map((h) => (
            <div key={h.id} className="panel p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-sumi">{h.name}</span>
                <span className="text-xs text-koi-deep font-bold">
                  {h.points} pts{h.concealed ? ' · concealed' : ''}
                </span>
              </div>
              <HandPattern hand={h} />
              {h.note && <p className="text-xs text-sumi-soft">{h.note}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
