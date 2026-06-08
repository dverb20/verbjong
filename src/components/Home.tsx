import { useStore } from '../state/store';
import { AVAILABLE_YEARS } from '../data/cards';
import type { Difficulty } from '../engine/game';
import { loadStats } from '../data/stats';

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string; disabled?: boolean }[] = [
  { id: 'easy', label: 'Easy', blurb: 'Gentle, beatable' },
  { id: 'medium', label: 'Medium', blurb: 'Solid play' },
  { id: 'hard', label: 'Hard', blurb: 'Sharp & wily' },
  { id: 'llm', label: 'AI (LLM)', blurb: 'Coming soon', disabled: true },
];

export function Home() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const startGame = useStore((s) => s.startGame);
  const setScreen = useStore((s) => s.setScreen);
  const stats = loadStats();

  return (
    <div className="flex flex-col h-full px-5 py-8 gap-5 overflow-y-auto no-scrollbar">
      <header className="text-center mt-2">
        <div className="text-3xl">🌸</div>
        <h1 className="text-4xl font-black tracking-tight text-sumi-deep">
          Verb<span className="text-sakura-deep">jong</span>
        </h1>
        <p className="text-sumi-soft text-sm mt-1">American Mahjong · a calm place to practice</p>
      </header>

      <section className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-sumi-soft">Card year</label>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSettings({ year: y })}
              className={`py-2.5 rounded-2xl font-semibold border transition ${
                settings.year === y
                  ? 'bg-sakura text-white border-sakura-deep shadow-petal'
                  : 'bg-white/70 border-washi-deep text-sumi hover:bg-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-sumi-soft">Opponents</label>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              disabled={d.disabled}
              onClick={() => setSettings({ difficulty: d.id })}
              className={`p-3 rounded-2xl text-left border transition ${
                d.disabled
                  ? 'opacity-50 cursor-not-allowed bg-white/40 border-washi-deep'
                  : settings.difficulty === d.id
                    ? 'bg-matcha text-white border-matcha-deep shadow-soft'
                    : 'bg-white/70 border-washi-deep text-sumi hover:bg-white'
              }`}
            >
              <div className="font-bold">{d.label}</div>
              <div className="text-xs opacity-80">{d.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between panel px-4 py-3">
        <div>
          <div className="font-semibold text-sumi">Charleston</div>
          <div className="text-xs text-sumi-soft">Pass tiles before play</div>
        </div>
        <button
          onClick={() => setSettings({ charlestonEnabled: !settings.charlestonEnabled })}
          className={`w-12 h-7 rounded-full transition relative ${
            settings.charlestonEnabled ? 'bg-matcha' : 'bg-washi-deep'
          }`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
              settings.charlestonEnabled ? 'left-[1.4rem]' : 'left-0.5'
            }`}
          />
        </button>
      </section>

      <section className="flex items-center justify-between panel px-4 py-3">
        <div>
          <div className="font-semibold text-sumi">Step through turns</div>
          <div className="text-xs text-sumi-soft">Pause after each opponent's discard</div>
        </div>
        <button
          onClick={() => setSettings({ pauseOnDiscard: !settings.pauseOnDiscard })}
          className={`w-12 h-7 rounded-full transition relative ${
            settings.pauseOnDiscard ? 'bg-matcha' : 'bg-washi-deep'
          }`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
              settings.pauseOnDiscard ? 'left-[1.4rem]' : 'left-0.5'
            }`}
          />
        </button>
      </section>

      <button
        onClick={startGame}
        className="w-full py-4 btn-primary text-lg"
      >
        Play 🀄
      </button>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <button onClick={() => setScreen('cards')} className="py-3 btn-soft">
          🎴 Cards
        </button>
        <button onClick={() => setScreen('editor')} className="py-3 btn-soft">
          ✎ Editor
        </button>
        <button onClick={() => setScreen('stats')} className="py-3 btn-soft">
          🌱 Progress
        </button>
      </div>

      <button
        onClick={() => setScreen('glossary')}
        className="w-full py-3 rounded-full bg-matcha-soft border border-matcha text-matcha-deep font-semibold text-sm"
      >
        🌼 New here? What do the symbols mean?
      </button>

      <p className="text-center text-xs text-sumi-soft">
        {stats.gamesPlayed > 0
          ? `${stats.wins} of ${stats.gamesPlayed} games won · best ${stats.bestPoints} pts`
          : 'Play your first game to begin your garden of progress.'}
      </p>
      <p className="text-center text-[10px] text-sumi-soft/70 leading-relaxed">
        Plays with an original practice card (not the copyrighted NMJL card). Add your own hands in the
        Editor — they stay on this device.
      </p>
    </div>
  );
}
