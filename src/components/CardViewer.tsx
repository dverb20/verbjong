import { useMemo } from 'react';
import { useStore } from '../state/store';
import { getCard } from '../data/cards';
import { HandPattern } from './HandPattern';
import type { Hand } from '../engine/cardSchema';

export function CardViewer() {
  const year = useStore((s) => s.settings.year);
  const setScreen = useStore((s) => s.setScreen);
  const card = useMemo(() => getCard(year), [year]);

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-black/20">
        <button onClick={() => setScreen('home')} className="opacity-70 hover:opacity-100">
          ← Back
        </button>
        <h2 className="font-bold">{card.name}</h2>
        <button onClick={() => setScreen('editor')} className="text-amber-300 text-sm">
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-5">
        <p className="text-xs text-emerald-200/60">
          Colours show how many distinct suits a hand needs (the card's colour rule). “N” means any
          number; “N+1” the next consecutive. Jokers are allowed only in groups of 3+.
        </p>
        {byCategory.map(([cat, hands]) => (
          <section key={cat} className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-amber-300/80 border-b border-white/10 pb-1">
              {cat}
            </h3>
            {hands.map((h) => (
              <div key={h.id} className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{h.name}</span>
                  <span className="text-xs text-amber-300 font-bold">
                    {h.points} pts{h.concealed ? ' · C' : ''}
                  </span>
                </div>
                <HandPattern hand={h} />
                {h.note && <p className="text-xs text-emerald-200/60">{h.note}</p>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
