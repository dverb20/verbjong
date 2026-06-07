// stats.ts — lightweight local progress tracking to support "leveling up".

export interface Stats {
  gamesPlayed: number;
  wins: number;
  wallGames: number;
  bestPoints: number;
  byDifficulty: Record<string, { played: number; wins: number }>;
}

const STORAGE_KEY = 'verbjong.stats.v1';

const empty = (): Stats => ({
  gamesPlayed: 0,
  wins: 0,
  wallGames: 0,
  bestPoints: 0,
  byDifficulty: {},
});

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Stats) } : empty();
  } catch {
    return empty();
  }
}

function save(stats: Stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

export function recordGame(opts: {
  difficulty: string;
  won: boolean;
  wall: boolean;
  points: number;
}): Stats {
  const stats = loadStats();
  stats.gamesPlayed++;
  if (opts.won) stats.wins++;
  if (opts.wall) stats.wallGames++;
  if (opts.points > stats.bestPoints) stats.bestPoints = opts.points;
  const d = (stats.byDifficulty[opts.difficulty] ??= { played: 0, wins: 0 });
  d.played++;
  if (opts.won) d.wins++;
  save(stats);
  return stats;
}

export function resetStats(): Stats {
  save(empty());
  return empty();
}
