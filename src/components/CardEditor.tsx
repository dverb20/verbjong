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
    setMessage({ kind: 'ok', text: 'Reverted to the built-in practice card.' });
  };

  const badHands = parsed.card?.hands.filter((h) => !isHandWellFormed(h)) ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-b border-washi-deep">
        <button onClick={() => setScreen('home')} className="text-sumi-soft hover:text-sumi">
          ← Back
        </button>
        <h2 className="font-bold text-sumi-deep">✎ Card Editor</h2>
        <button onClick={() => setScreen('cards')} className="text-koi-deep text-sm font-semibold">
          View
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {AVAILABLE_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => reload(y)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                year === y ? 'bg-sakura text-white border-sakura-deep' : 'bg-white/70 border-washi-deep text-sumi'
              }`}
            >
              {y}
              {hasOverride(y) ? ' ✎' : ''}
            </button>
          ))}
        </div>

        <p className="text-xs text-sumi-soft leading-relaxed">
          Advanced: this edits the card as raw data. Each hand's groups must total 14 tiles. Roles:{' '}
          <code>number</code>, <code>flower</code>, <code>dragon</code>, <code>soap</code>,{' '}
          <code>wind</code>, <code>yearDigit</code>. Use <code>suitRef</code> “A/B/C” for the colour
          rule and <code>numberRef</code> “n/n+1/n+2” or a fixed number. Saved cards stay on this device.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="w-full h-48 rounded-2xl bg-white/80 border border-washi-deep p-3 font-mono text-xs text-sumi-deep"
        />

        {parsed.error && <div className="text-crak text-xs">Invalid JSON: {parsed.error}</div>}
        {!parsed.error && badHands.length > 0 && (
          <div className="text-koi-deep text-xs">
            {badHands.length} hand(s) don't total 14 tiles: {badHands.map((h) => h.name).join(', ')}
          </div>
        )}
        {message && (
          <div className={`text-xs ${message.kind === 'ok' ? 'text-matcha-deep' : 'text-crak'}`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-3 btn-primary">
            Save
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setMessage({ kind: 'ok', text: 'Copied JSON to clipboard.' });
            }}
            className="px-4 py-3 btn-soft"
          >
            Copy
          </button>
          <button onClick={reset} className="px-4 py-3 btn-soft">
            Reset
          </button>
        </div>

        {parsed.card && (
          <section className="space-y-2 pt-2">
            <h3 className="text-xs uppercase tracking-wider text-koi-deep font-bold">Preview</h3>
            {parsed.card.hands.map((h, i) => (
              <div key={i} className="panel p-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-sumi">{h.name}</span>
                  <span className={isHandWellFormed(h) ? 'text-matcha-deep text-xs' : 'text-crak text-xs'}>
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
