import { useStore } from '../state/store';
import { AVAILABLE_YEARS } from '../data/cards';
import type { Difficulty } from '../engine/game';
import { loadStats } from '../data/stats';

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string; disabled?: boolean }[] = [
  { id: 'easy', label: 'Easy', blurb: 'Loose, beatable bots' },
  { id: 'medium', label: 'Medium', blurb: 'Solid, greedy play' },
  { id: 'hard', label: 'Hard', blurb: 'Sharp & defensive' },
  { id: 'llm', label: 'AI (LLM)', blurb: 'Coming soon', disabled: true },
];

export function Home() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const startGame = useStore((s) => s.startGame);
  const setScreen = useStore((s) => s.setScreen);
  const stats = loadStats();

  return (
    <div className="flex flex-col h-full px-5 py-8 gap-6 overflow-y-auto no-scrollbar">
      <header className="text-center mt-4">
        <h1 className="text-4xl font-black tracking-tight">
          Verb<span className="text-amber-400">jong</span>
        </h1>
        <p className="text-emerald-200/80 text-sm mt-1">American Mahjong practice — solo vs bots</p>
      </header>

      <section className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-emerald-200/70">Card year</label>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSettings({ year: y })}
              className={`py-2 rounded-lg font-semibold border transition ${
                settings.year === y
                  ? 'bg-amber-400 text-emerald-950 border-amber-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-emerald-200/70">Difficulty</label>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              disabled={d.disabled}
              onClick={() => setSettings({ difficulty: d.id })}
              className={`p-3 rounded-lg text-left border transition ${
                d.disabled
                  ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10'
                  : settings.difficulty === d.id
                    ? 'bg-amber-400 text-emerald-950 border-amber-300'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="font-bold">{d.label}</div>
              <div className="text-xs opacity-80">{d.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3">
        <div>
          <div className="font-semibold">Charleston</div>
          <div className="text-xs text-emerald-200/70">Pass tiles before play</div>
        </div>
        <button
          onClick={() => setSettings({ charlestonEnabled: !settings.charlestonEnabled })}
          className={`w-12 h-7 rounded-full transition relative ${
            settings.charlestonEnabled ? 'bg-amber-400' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${
              settings.charlestonEnabled ? 'left-[1.4rem]' : 'left-0.5'
            }`}
          />
        </button>
      </section>

      <button
        onClick={startGame}
        className="w-full py-4 rounded-xl bg-amber-400 text-emerald-950 font-black text-lg shadow-lg active:scale-[0.98] transition"
      >
        Play ▸
      </button>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <button onClick={() => setScreen('cards')} className="py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          Card
        </button>
        <button onClick={() => setScreen('editor')} className="py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          Editor
        </button>
        <button onClick={() => setScreen('stats')} className="py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          Stats
        </button>
      </div>

      <p className="text-center text-xs text-emerald-200/50">
        {stats.gamesPlayed > 0
          ? `${stats.wins}/${stats.gamesPlayed} wins · best ${stats.bestPoints} pts`
          : 'Play your first game to start tracking progress.'}
      </p>
      <p className="text-center text-[10px] text-emerald-200/40 leading-relaxed">
        Uses an original practice card — not the copyrighted NMJL card. Enter your own card's hands in the Editor.
      </p>
    </div>
  );
}
