// HandPattern.tsx — renders a card Hand as colour-coded pattern chips.
// Colours encode the abstract suit labels (A/B/C) so the "how many suits" rule
// is visible at a glance — exactly how the printed card uses colour.

import type { Group, Hand } from '../engine/cardSchema';

const SUIT_REF_STYLE: Record<string, string> = {
  A: 'bg-sakura-soft text-sakura-deep border-sakura',
  B: 'bg-sora-soft text-sora-deep border-sora',
  C: 'bg-matcha-soft text-matcha-deep border-matcha',
};
const NEUTRAL = 'bg-washi text-sumi border-washi-deep';

function groupSymbol(g: Group): string {
  switch (g.role) {
    case 'flower':
      return 'F';
    case 'soap':
      return '0';
    case 'wind':
      return g.wind ?? 'W';
    case 'dragon':
      return g.dragon === 'red' ? '中' : g.dragon === 'green' ? '發' : 'D';
    case 'yearDigit':
      return String(g.digit ?? 0);
    case 'number': {
      if (typeof g.numberRef === 'number') return String(g.numberRef);
      return (g.numberRef ?? 'N').toUpperCase();
    }
  }
}

export function HandPattern({ hand }: { hand: Hand }) {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {hand.groups.map((g, gi) => {
        const style = g.suitRef ? (SUIT_REF_STYLE[g.suitRef] ?? NEUTRAL) : NEUTRAL;
        const sym = groupSymbol(g);
        return (
          <span key={gi} className="flex gap-0.5">
            {Array.from({ length: g.count }).map((_, i) => (
              <span
                key={i}
                className={`inline-flex items-center justify-center w-6 h-7 rounded-md border text-xs font-bold ${style}`}
              >
                {sym}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
