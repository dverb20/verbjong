import { useStore } from '../state/store';
import { loadStats, resetStats } from '../data/stats';
import { useState } from 'react';

export function StatsScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const refreshStats = useStore((s) => s.refreshStats);
  const [stats, setStats] = useState(() => loadStats());

  const winRate = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-b border-washi-deep">
        <button onClick={() => setScreen('home')} className="text-sumi-soft hover:text-sumi">
          ← Back
        </button>
        <h2 className="font-bold text-sumi-deep">🌱 Your Progress</h2>
        <span className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Games" value={stats.gamesPlayed} />
          <Stat label="Wins" value={stats.wins} />
          <Stat label="Win rate" value={`${winRate}%`} />
          <Stat label="Best hand" value={`${stats.bestPoints} pts`} />
        </div>

        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-koi-deep font-bold">By difficulty</h3>
          {Object.keys(stats.byDifficulty).length === 0 && (
            <p className="text-sm text-sumi-soft">No games yet — play to fill this in.</p>
          )}
          {Object.entries(stats.byDifficulty).map(([d, v]) => (
            <div key={d} className="flex justify-between panel px-3 py-2 text-sm">
              <span className="capitalize text-sumi">{d}</span>
              <span className="text-sumi-soft">
                {v.wins}/{v.played} ({v.played ? Math.round((v.wins / v.played) * 100) : 0}%)
              </span>
            </div>
          ))}
        </section>

        <button
          onClick={() => {
            const next = resetStats();
            setStats(next);
            refreshStats();
          }}
          className="w-full py-3 btn-soft text-sm"
        >
          Reset stats
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-4 text-center">
      <div className="text-3xl font-black text-matcha-deep">{value}</div>
      <div className="text-xs uppercase tracking-wider text-sumi-soft mt-1">{label}</div>
    </div>
  );
}
