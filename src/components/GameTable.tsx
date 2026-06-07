import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Tile } from './Tile';
import type { Tile as TileT } from '../engine/tiles';
import {
  canStopCharleston,
  charlestonStep,
  fullRack,
  jokerExchangeOptions,
  tileLabel,
} from '../engine/game';
import type { GameState, Player } from '../engine/game';
import { findBestHand } from '../engine/matcher';

const KIND_ORDER: Record<string, number> = { suit: 0, wind: 1, dragon: 2, flower: 3, joker: 4 };
const SUIT_ORDER: Record<string, number> = { bam: 0, crak: 1, dot: 2 };

function sortRack(tiles: TileT[]): TileT[] {
  return [...tiles].sort((a, b) => {
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (a.kind === 'suit') return SUIT_ORDER[a.suit!] - SUIT_ORDER[b.suit!] || a.rank! - b.rank!;
    if (a.kind === 'wind') return a.wind!.localeCompare(b.wind!);
    if (a.kind === 'dragon') return (a.dragon ?? '').localeCompare(b.dragon ?? '');
    return 0;
  });
}

export function GameTable() {
  const game = useStore((s) => s.game)!;
  const newGame = useStore((s) => s.newGame);

  if (!game) return null;
  return (
    <div className="relative flex flex-col h-full">
      <TopBar game={game} onExit={newGame} />
      <Opponents game={game} />
      <Center game={game} />
      <Bottom game={game} />
      {game.phase === 'result' && <ResultOverlay />}
    </div>
  );
}

function TopBar({ game, onExit }: { game: GameState; onExit: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm bg-black/20">
      <button onClick={onExit} className="opacity-70 hover:opacity-100">
        ← Exit
      </button>
      <span className="opacity-70">
        {game.card.name} · Wall {game.wall.length}
      </span>
      <span className="opacity-70">{game.phase === 'charleston' ? 'Charleston' : 'Playing'}</span>
    </div>
  );
}

function Opponents({ game }: { game: GameState }) {
  const bots = game.players.filter((p) => p.isBot);
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-2">
      {bots.map((p) => (
        <OpponentCard key={p.seat} player={p} active={game.currentSeat === p.seat} />
      ))}
    </div>
  );
}

function OpponentCard({ player, active }: { player: Player; active: boolean }) {
  return (
    <div
      className={`rounded-lg p-2 border text-center ${
        active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="font-semibold text-sm truncate">{player.name}</div>
      <div className="text-xs opacity-70">{player.concealed.length} tiles</div>
      <div className="flex flex-wrap gap-0.5 justify-center mt-1 min-h-[1rem]">
        {player.exposures.flatMap((e, ei) =>
          e.tiles.map((t, ti) => <Tile key={`${ei}-${ti}`} tile={t} size="sm" />),
        )}
      </div>
    </div>
  );
}

function Center({ game }: { game: GameState }) {
  return (
    <div className="flex-1 min-h-0 px-3 py-2 flex flex-col">
      <div className="text-xs uppercase tracking-wider text-emerald-200/60 mb-1">Discards</div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="flex flex-wrap gap-1 content-start">
          {game.discards.map((t, i) => (
            <Tile
              key={t.id}
              tile={t}
              size="sm"
              className={i === game.discards.length - 1 && game.lastDiscard ? 'ring-2 ring-amber-400' : ''}
            />
          ))}
          {game.discards.length === 0 && (
            <span className="text-emerald-200/40 text-sm">No discards yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Bottom({ game }: { game: GameState }) {
  const me = game.players[0];
  const sorted = useMemo(() => sortRack(me.concealed), [me.concealed]);
  const best = useMemo(() => findBestHand(fullRack(me), game.card.hands), [me, game.card.hands]);

  const [selected, setSelected] = useState<string | null>(null);
  const humanDiscard = useStore((s) => s.humanDiscard);
  const selfDrawWin = useStore((s) => s.selfDrawWin);
  const declareSelfDraw = useStore((s) => s.declareSelfDraw);
  const callPrompt = useStore((s) => s.callPrompt);
  const jokerExchange = useStore((s) => s.humanJokerExchange);

  const myTurn = game.phase === 'play' && game.currentSeat === 0 && game.turnState === 'awaitingDiscard';
  const inCharleston = game.phase === 'charleston';
  const swaps = game.phase === 'play' ? jokerExchangeOptions(game, 0) : [];

  // The Charleston has its own integrated 3-pick rack, so render it on its own.
  if (inCharleston) {
    return (
      <div className="bg-black/30 border-t border-white/10 px-2 pt-2 pb-3 space-y-2">
        <CharlestonControls />
      </div>
    );
  }

  return (
    <div className="bg-black/30 border-t border-white/10 px-2 pt-2 pb-3 space-y-2">
      {/* coaching hint */}
      {best && game.phase === 'play' && (
        <div className="text-center text-xs text-emerald-200/70">
          Closest: <span className="text-amber-300 font-semibold">{best.hand.name}</span> ·{' '}
          {best.tilesShort} away
        </div>
      )}

      {/* your exposures */}
      {me.exposures.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {me.exposures.flatMap((e, ei) =>
            e.tiles.map((t, ti) => <Tile key={`me-${ei}-${ti}`} tile={t} size="sm" />),
          )}
        </div>
      )}

      {/* rack */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 justify-center flex-wrap">
        {sorted.map((t) => (
          <Tile
            key={t.id}
            tile={t}
            size="md"
            selected={selected === t.id}
            onClick={
              inCharleston || myTurn
                ? () => setSelected((cur) => (cur === t.id ? null : t.id))
                : undefined
            }
          />
        ))}
      </div>

      {/* action area */}
      {inCharleston ? (
        <CharlestonControls />
      ) : callPrompt ? (
        <CallControls />
      ) : (
        <div className="flex gap-2">
          {selfDrawWin && (
            <button
              onClick={declareSelfDraw}
              className="flex-1 py-3 rounded-xl bg-amber-400 text-emerald-950 font-black animate-pop"
            >
              Declare Mahjong! 🀄
            </button>
          )}
          {swaps.length > 0 && (
            <button
              onClick={() => jokerExchange(swaps[0].targetSeat, swaps[0].exposureIdx, swaps[0].tileId)}
              className="px-4 py-3 rounded-xl bg-fuchsia-600/80 font-semibold text-sm"
            >
              Swap joker
            </button>
          )}
          <button
            disabled={!myTurn || !selected}
            onClick={() => {
              if (selected) {
                humanDiscard(selected);
                setSelected(null);
              }
            }}
            className={`flex-1 py-3 rounded-xl font-black transition ${
              myTurn && selected
                ? 'bg-amber-400 text-emerald-950 active:scale-95'
                : 'bg-white/10 text-white/40'
            }`}
          >
            {myTurn ? (selected ? 'Discard' : 'Select a tile') : 'Waiting…'}
          </button>
        </div>
      )}
    </div>
  );
}

function CharlestonControls() {
  const game = useStore((s) => s.game)!;
  const submit = useStore((s) => s.submitCharleston);
  const stop = useStore((s) => s.stopCharlestonNow);
  const step = charlestonStep(game);
  const me = game.players[0];

  // We re-read the selection from the rack's selected ring via a local mirror.
  const [picked, setPicked] = useState<string[]>([]);
  // Sync: clear picks when the pass changes.
  const stepKey = game.charlestonIndex;

  return (
    <CharlestonInner
      key={stepKey}
      dir={step?.dir ?? 'right'}
      canStop={canStopCharleston(game)}
      onStop={stop}
      onSubmit={(ids) => submit(ids)}
      tiles={me.concealed}
      picked={picked}
      setPicked={setPicked}
    />
  );
}

/**
 * Charleston picker. Because the rack tiles are rendered by Bottom(), we provide
 * a compact instruction + confirm bar here; selection is mirrored via window
 * events would be overkill, so we render our own 3-pick chooser inline.
 */
function CharlestonInner(props: {
  dir: string;
  canStop: boolean;
  onStop: () => void;
  onSubmit: (ids: string[]) => void;
  tiles: TileT[];
  picked: string[];
  setPicked: (p: string[]) => void;
}) {
  const { dir, canStop, onStop, onSubmit, tiles, picked, setPicked } = props;
  const sorted = useMemo(() => sortRack(tiles), [tiles]);
  const toggle = (id: string) => {
    const t = tiles.find((x) => x.id === id)!;
    if (t.kind === 'joker') return; // jokers can't be passed
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length < 3) setPicked([...picked, id]);
  };
  return (
    <div className="space-y-2">
      <div className="text-center text-sm">
        Pass <span className="font-bold text-amber-300 uppercase">{dir}</span> — pick 3 tiles ({picked.length}/3)
      </div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar justify-center flex-wrap">
        {sorted.map((t) => (
          <Tile
            key={t.id}
            tile={t}
            size="md"
            selected={picked.includes(t.id)}
            dimmed={t.kind === 'joker'}
            onClick={() => toggle(t.id)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {canStop && (
          <button onClick={onStop} className="px-4 py-3 rounded-xl bg-white/10 font-semibold">
            Stop
          </button>
        )}
        <button
          disabled={picked.length !== 3}
          onClick={() => {
            onSubmit(picked);
            setPicked([]);
          }}
          className={`flex-1 py-3 rounded-xl font-black transition ${
            picked.length === 3 ? 'bg-amber-400 text-emerald-950 active:scale-95' : 'bg-white/10 text-white/40'
          }`}
        >
          Pass {dir}
        </button>
      </div>
    </div>
  );
}

function CallControls() {
  const game = useStore((s) => s.game)!;
  const prompt = useStore((s) => s.callPrompt)!;
  const callExposure = useStore((s) => s.humanCallExposure);
  const callMahjong = useStore((s) => s.humanCallMahjong);
  const pass = useStore((s) => s.humanPassCall);
  const tile = game.lastDiscard?.tile;

  return (
    <div className="space-y-2 animate-pop">
      <div className="text-center text-sm">
        {tile ? (
          <>
            Claim <span className="font-bold text-amber-300">{tileLabel(tile)}</span>?
          </>
        ) : (
          'Claim the discard?'
        )}
      </div>
      <div className="flex gap-2">
        {prompt.canMahjong && (
          <button onClick={callMahjong} className="flex-1 py-3 rounded-xl bg-amber-400 text-emerald-950 font-black">
            Mahjong!
          </button>
        )}
        {prompt.maxExposure >= 3 && (
          <button onClick={() => callExposure(3)} className="flex-1 py-3 rounded-xl bg-sky-500/80 font-bold">
            Pung
          </button>
        )}
        {prompt.maxExposure >= 4 && (
          <button onClick={() => callExposure(4)} className="flex-1 py-3 rounded-xl bg-sky-600/80 font-bold">
            Kong
          </button>
        )}
        <button onClick={pass} className="px-5 py-3 rounded-xl bg-white/10 font-semibold">
          Pass
        </button>
      </div>
    </div>
  );
}

function ResultOverlay() {
  const game = useStore((s) => s.game)!;
  const coaching = useStore((s) => s.coaching);
  const newGame = useStore((s) => s.newGame);
  const startGame = useStore((s) => s.startGame);
  const won = game.result === 'win' && game.winner?.seat === 0;

  return (
    <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-6">
      <div className="bg-emerald-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 animate-pop">
        <div className="text-5xl">{won ? '🎉' : game.result === 'wall' ? '🧱' : '🀄'}</div>
        <h2 className="text-2xl font-black">
          {won ? 'You win!' : game.result === 'wall' ? 'Wall game' : `${game.players[game.winner!.seat].name} wins`}
        </h2>
        {coaching && <p className="text-emerald-100/80 text-sm">{coaching}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={newGame} className="flex-1 py-3 rounded-xl bg-white/10 font-semibold">
            Home
          </button>
          <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-amber-400 text-emerald-950 font-black">
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
