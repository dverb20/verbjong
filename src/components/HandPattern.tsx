// HandPattern.tsx — renders a card Hand as colour-coded pattern chips.
// Colours encode the abstract suit labels (A/B/C) so the "how many suits" rule
// is visible at a glance — exactly how the printed card uses colour.

import type { Group, Hand } from '../engine/cardSchema';

const SUIT_REF_STYLE: Record<string, string> = {
  A: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
  B: 'bg-sky-400/20 text-sky-200 border-sky-400/40',
  C: 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-400/40',
};
const NEUTRAL = 'bg-white/10 text-white/80 border-white/20';

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
                className={`inline-flex items-center justify-center w-6 h-7 rounded border text-xs font-bold ${style}`}
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
