// store.ts — UI state + the orchestrator that drives bot turns and the call window.
//
// The engine (engine/game.ts) is pure; this store sequences it: it auto-draws,
// lets bots think (with small delays so play is watchable), resolves who may
// claim a discard, and surfaces decisions the human must make.

import { create } from 'zustand';
import { makeBot, type BotStrategy } from '../bots/strategy';
import { LlmBot } from '../bots/llmBot';
import { getCard } from '../data/cards';
import { loadStats, recordGame, type Stats } from '../data/stats';
import {
  applyCharlestonPass,
  callExposure,
  canCallMahjong,
  charlestonStep,
  checkWin,
  createGame,
  declareMahjong,
  discardTile,
  drawTile,
  type Difficulty,
  type GameState,
  jokerExchange,
  legalExposureCounts,
  passDiscard,
  stopCharleston,
} from '../engine/game';
import { matchHand } from '../engine/matcher';

export type Screen = 'home' | 'game' | 'cards' | 'editor' | 'stats' | 'glossary';

export interface Settings {
  year: number;
  difficulty: Difficulty;
  charlestonEnabled: boolean;
  playerName: string;
  /** Pause after each opponent's discard so you can claim it or continue. */
  pauseOnDiscard: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  year: 2026,
  difficulty: 'medium',
  charlestonEnabled: true,
  playerName: 'You',
  pauseOnDiscard: true,
};

// --- session persistence ---------------------------------------------------
// We save the active game, the current screen, and settings so a page refresh
// doesn't lose your place. The whole GameState is plain JSON (tiles are plain
// objects; the RNG and timers live outside state), so it serialises cleanly.
const SESSION_KEY = 'verbjong.session.v1';

interface SavedSession {
  screen?: Screen;
  settings?: Settings;
  game?: GameState | null;
}

function loadSession(): SavedSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : {};
  } catch {
    return {};
  }
}

function saveSession(s: SavedSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — session just won't persist */
  }
}

interface StoreState {
  screen: Screen;
  game: GameState | null;
  settings: Settings;
  /** When set, the human must respond to a callable discard. `counts` lists the
   *  legal exposure sizes (3/4/5) they may make from it. */
  callPrompt: { canMahjong: boolean; counts: number[] } | null;
  /** True when the human's freshly-drawn rack is a winning hand. */
  selfDrawWin: boolean;
  /** Post-game coaching line. */
  coaching: string | null;
  stats: Stats;

  setScreen: (s: Screen) => void;
  setSettings: (patch: Partial<Settings>) => void;
  startGame: () => void;
  newGame: () => void;

  humanDiscard: (tileId: string) => void;
  humanCallExposure: (count: number) => void;
  humanCallMahjong: () => void;
  humanPassCall: () => void;
  humanJokerExchange: (targetSeat: number, exposureIdx: number, tileId: string) => void;
  declareSelfDraw: () => void;

  submitCharleston: (tileIds: string[]) => void;
  stopCharlestonNow: () => void;

  refreshStats: () => void;
  /** Resume driving a game restored from a previous session (after a refresh). */
  resume: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
const bots = new Map<Difficulty, BotStrategy>();
function botFor(difficulty: Difficulty): BotStrategy {
  if (!bots.has(difficulty)) bots.set(difficulty, difficulty === 'llm' ? new LlmBot() : makeBot(difficulty));
  return bots.get(difficulty)!;
}

export const useStore = create<StoreState>((set, get) => {
  // --- orchestration ------------------------------------------------------
  function apply(next: GameState) {
    set({ game: next });
    finalizeIfResult(next);
  }

  function finalizeIfResult(g: GameState) {
    if (g.phase !== 'result') return;
    if ((g as GameState & { _recorded?: boolean })._recorded) return;
    (g as GameState & { _recorded?: boolean })._recorded = true;
    const { difficulty } = get().settings;
    const won = g.result === 'win' && g.winner?.seat === 0;
    const points = won ? g.winner?.points ?? 0 : 0;
    recordGame({ difficulty, won, wall: g.result === 'wall', points });

    let coaching: string;
    if (won) {
      coaching = `You won with “${g.winner!.handName}” for ${points} points. Keep it up!`;
    } else if (g.result === 'win') {
      const me = g.players[0];
      const rack = [...me.concealed, ...me.exposures.flatMap((e) => e.tiles)];
      let best = Infinity;
      let name = '';
      for (const h of g.card.hands) {
        const d = matchHand(rack, h).tilesShort;
        if (d < best) {
          best = d;
          name = h.name;
        }
      }
      coaching = `${g.winner ? g.players[g.winner.seat].name : 'A bot'} won. You were ${best} tile${best === 1 ? '' : 's'} from “${name}”.`;
    } else {
      coaching = 'Wall game — nobody completed a hand. Try a faster-building hand next time.';
    }
    set({ coaching, stats: loadStats() });
  }

  function botMahjongSeat(g: GameState): number | null {
    const from = g.lastDiscard?.seat;
    if (from === undefined) return null;
    for (let off = 1; off <= 3; off++) {
      const seat = (from + off) % 4;
      if (g.players[seat].isBot && canCallMahjong(g, seat)) return seat;
    }
    return null;
  }

  function botExposureSeat(g: GameState): { seat: number; count: number } | null {
    const from = g.lastDiscard?.seat;
    if (from === undefined) return null;
    for (let off = 1; off <= 3; off++) {
      const seat = (from + off) % 4;
      const p = g.players[seat];
      if (!p.isBot) continue;
      const decision = botFor(p.difficulty).decideCall(g, seat);
      if (decision.type === 'exposure') return { seat, count: decision.count };
    }
    return null;
  }

  /** Resolve a call window when the human has no say (or has passed). */
  function resolveBotsForDiscard(g: GameState): GameState {
    const mj = botMahjongSeat(g);
    if (mj !== null) return declareMahjong(g, mj, true);
    const exp = botExposureSeat(g);
    if (exp) return callExposure(g, exp.seat, exp.count);
    return passDiscard(g);
  }

  /** Compute the next automatic step, or null if we're waiting on the human. */
  function planNext(): { run: () => void; delay: number } | null {
    const g = get().game;
    if (!g || g.phase !== 'play') return null;

    if (g.turnState === 'awaitingDraw') {
      return { run: () => apply(drawTile(g)), delay: g.currentSeat === 0 ? 120 : 550 };
    }

    if (g.turnState === 'awaitingDiscard') {
      const seat = g.currentSeat;
      const win = checkWin(g, seat);
      if (seat === 0) {
        set({ selfDrawWin: !!win });
        return null; // human discards (or declares) via UI
      }
      if (win) return { run: () => apply(declareMahjong(g, seat, false)), delay: 700 };
      const tileId = botFor(g.players[seat].difficulty).chooseDiscard(g, seat);
      return { run: () => apply(discardTile(g, seat, tileId)), delay: 750 };
    }

    if (g.turnState === 'callWindow') {
      // Human's own win is offered first so a bot can never rob it.
      if (canCallMahjong(g, 0)) {
        set({ callPrompt: { canMahjong: true, counts: legalExposureCounts(g, 0) } });
        return null;
      }
      const botMJ = botMahjongSeat(g);
      if (botMJ !== null) return { run: () => apply(declareMahjong(g, botMJ, true)), delay: 650 };
      // Pause for the human when they can legally claim, OR (when stepping is on)
      // after any opponent's discard so they can review and continue at their pace.
      const counts = legalExposureCounts(g, 0);
      const fromOpponent = (g.lastDiscard?.seat ?? 0) !== 0;
      if (counts.length > 0 || (get().settings.pauseOnDiscard && fromOpponent)) {
        set({ callPrompt: { canMahjong: false, counts } });
        return null;
      }
      return { run: () => apply(resolveBotsForDiscard(g)), delay: 500 };
    }
    return null;
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    const plan = planNext();
    if (!plan) return;
    timer = setTimeout(() => {
      plan.run();
      schedule();
    }, plan.delay);
  }

  // --- public actions -----------------------------------------------------
  const saved = loadSession();
  return {
    screen: saved.game ? (saved.screen ?? 'home') : 'home',
    game: saved.game ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
    callPrompt: null,
    selfDrawWin: false,
    coaching: null,
    stats: loadStats(),

    setScreen: (s) => set({ screen: s }),
    setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

    startGame: () => {
      const { year, difficulty, charlestonEnabled, playerName } = get().settings;
      const game = createGame({
        year,
        card: getCard(year),
        botDifficulty: difficulty,
        charlestonEnabled,
        playerName,
      });
      set({ game, screen: 'game', callPrompt: null, selfDrawWin: false, coaching: null });
      schedule();
    },

    newGame: () => {
      if (timer) clearTimeout(timer);
      set({ game: null, screen: 'home', callPrompt: null, selfDrawWin: false });
    },

    humanDiscard: (tileId) => {
      const g = get().game;
      if (!g) return;
      set({ selfDrawWin: false });
      apply(discardTile(g, 0, tileId));
      schedule();
    },

    declareSelfDraw: () => {
      const g = get().game;
      if (!g) return;
      set({ selfDrawWin: false });
      apply(declareMahjong(g, 0, false));
    },

    humanCallExposure: (count) => {
      const g = get().game;
      if (!g) return;
      set({ callPrompt: null });
      apply(callExposure(g, 0, count));
      schedule();
    },

    humanCallMahjong: () => {
      const g = get().game;
      if (!g) return;
      set({ callPrompt: null });
      apply(declareMahjong(g, 0, true));
    },

    humanPassCall: () => {
      const g = get().game;
      if (!g) return;
      set({ callPrompt: null });
      apply(resolveBotsForDiscard(g));
      schedule();
    },

    humanJokerExchange: (targetSeat, exposureIdx, tileId) => {
      const g = get().game;
      if (!g) return;
      apply(jokerExchange(g, 0, targetSeat, exposureIdx, tileId));
    },

    submitCharleston: (tileIds) => {
      const g = get().game;
      if (!g || g.phase !== 'charleston') return;
      const step = charlestonStep(g);
      if (!step) return;
      const selections: Record<number, string[]> = { 0: tileIds };
      for (const p of g.players) {
        if (p.isBot) selections[p.seat] = botFor(p.difficulty).chooseCharlestonPass(g, p.seat);
      }
      apply(applyCharlestonPass(g, selections));
      schedule();
    },

    stopCharlestonNow: () => {
      const g = get().game;
      if (!g) return;
      apply(stopCharleston(g));
      schedule();
    },

    refreshStats: () => set({ stats: loadStats() }),

    resume: () => schedule(),
  };
});

// Persist screen + settings + the active game on every change, so a refresh
// keeps your place.
useStore.subscribe((s) => saveSession({ screen: s.screen, settings: s.settings, game: s.game }));

// If a game was restored from a previous session, pick the orchestration back up
// (draw for bots, re-offer a pending call, etc.). Runs once at startup.
{
  const g = useStore.getState().game;
  if (g && g.phase !== 'result') useStore.getState().resume();
}
