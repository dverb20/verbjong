import { useMemo } from 'react';
import { useStore } from '../state/store';
import { AVAILABLE_YEARS, getCard } from '../data/cards';
import { CardHandsList } from './CardHandsList';

export function CardViewer() {
  const year = useStore((s) => s.settings.year);
  const setSettings = useStore((s) => s.setSettings);
  const setScreen = useStore((s) => s.setScreen);
  const card = useMemo(() => getCard(year), [year]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-b border-washi-deep">
        <button onClick={() => setScreen('home')} className="text-sumi-soft hover:text-sumi">
          ← Back
        </button>
        <h2 className="font-bold text-sumi-deep">🎴 Cards</h2>
        <span className="w-10" />
      </div>

      {/* Year tabs — tap a year to view that card. */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto no-scrollbar">
        {AVAILABLE_YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setSettings({ year: y })}
            className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 border transition ${
              year === y
                ? 'bg-sakura text-white border-sakura-deep shadow-petal'
                : 'bg-white/70 border-washi-deep text-sumi hover:bg-white'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="px-2 pb-1 text-center text-xs text-sumi-soft">{card.name}</div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
        <CardHandsList card={card} />
      </div>
    </div>
  );
}
