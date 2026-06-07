import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { AVAILABLE_YEARS, exportCardJson, hasOverride, importCardJson, resetCard } from '../data/cards';
import type { MahjongCard } from '../engine/cardSchema';
import { isHandWellFormed } from '../engine/cardSchema';
import { HandPattern } from './HandPattern';

export function CardEditor() {
  const setScreen = useStore((s) => s.setScreen);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const year = settings.year;

  const [text, setText] = useState(() => exportCardJson(year));
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const parsed = useMemo<{ card?: MahjongCard; error?: string }>(() => {
    try {
      const card = JSON.parse(text) as MahjongCard;
      if (!Array.isArray(card.hands)) return { error: 'Missing hands[] array.' };
      return { card };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [text]);

  const reload = (y: number) => {
    setSettings({ year: y });
    setText(exportCardJson(y));
    setMessage(null);
  };

  const save = () => {
    try {
      importCardJson(year, text);
      setMessage({ kind: 'ok', text: 'Saved. This card is now used for ' + year + '.' });
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message });
    }
  };

  const reset = () => {
    resetCard(year);
    setText(exportCardJson(year));
    setMessage({ kind: 'ok', text: 'Reverted to the built-in demo card.' });
  };

  const badHands = parsed.card?.hands.filter((h) => !isHandWellFormed(h)) ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-black/20">
        <button onClick={() => setScreen('home')} className="opacity-70 hover:opacity-100">
          ← Back
        </button>
        <h2 className="font-bold">Card Editor</h2>
        <button onClick={() => setScreen('cards')} className="text-amber-300 text-sm">
          View
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {AVAILABLE_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => reload(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                year === y ? 'bg-amber-400 text-emerald-950 border-amber-300' : 'bg-white/5 border-white/10'
              }`}
            >
              {y}
              {hasOverride(y) ? ' ✎' : ''}
            </button>
          ))}
        </div>

        <p className="text-xs text-emerald-200/60">
          Edit the JSON below to enter the hands from a card you own (for personal use). Each hand's
          groups must total 14 tiles. Roles: <code>number</code>, <code>flower</code>,{' '}
          <code>dragon</code>, <code>soap</code>, <code>wind</code>, <code>yearDigit</code>. Use{' '}
          <code>suitRef</code> “A/B/C” for the colour rule and <code>numberRef</code>{' '}
          “n/n+1/n+2” or a fixed number.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="w-full h-48 rounded-lg bg-black/40 border border-white/10 p-3 font-mono text-xs text-emerald-100"
        />

        {parsed.error && <div className="text-red-300 text-xs">Invalid JSON: {parsed.error}</div>}
        {!parsed.error && badHands.length > 0 && (
          <div className="text-amber-300 text-xs">
            {badHands.length} hand(s) don't total 14 tiles: {badHands.map((h) => h.name).join(', ')}
          </div>
        )}
        {message && (
          <div className={`text-xs ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-3 rounded-xl bg-amber-400 text-emerald-950 font-black">
            Save
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setMessage({ kind: 'ok', text: 'Copied JSON to clipboard.' });
            }}
            className="px-4 py-3 rounded-xl bg-white/10 font-semibold"
          >
            Copy
          </button>
          <button onClick={reset} className="px-4 py-3 rounded-xl bg-white/10 font-semibold">
            Reset
          </button>
        </div>

        {parsed.card && (
          <section className="space-y-2 pt-2">
            <h3 className="text-xs uppercase tracking-wider text-amber-300/80">Preview</h3>
            {parsed.card.hands.map((h, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{h.name}</span>
                  <span className={isHandWellFormed(h) ? 'text-emerald-300 text-xs' : 'text-red-300 text-xs'}>
                    {h.groups.reduce((s, g) => s + g.count, 0)}/14
                  </span>
                </div>
                <HandPattern hand={h} />
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
