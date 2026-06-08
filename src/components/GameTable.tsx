import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Tile } from './Tile';
import type { Tile as TileT } from '../engine/tiles';
import {
  canStopCharleston,
  charlestonStep,
  fullRack,
  isJoker,
  jokerExchangeOptions,
  tileKey,
  tileLabel,
} from '../engine/game';
import type { GameState, Player } from '../engine/game';
import { findBestHand } from '../engine/matcher';
import { CardHandsList } from './CardHandsList';

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
  const [showCard, setShowCard] = useState(false);

  if (!game) return null;
  return (
    <div className="relative flex flex-col h-full">
      <TopBar game={game} onExit={newGame} onViewCard={() => setShowCard(true)} />
      <Opponents game={game} />
      <Center game={game} />
      <Bottom game={game} />
      {showCard && <CardOverlay game={game} onClose={() => setShowCard(false)} />}
      {game.phase === 'result' && <ResultOverlay />}
    </div>
  );
}

function TopBar({
  game,
  onExit,
  onViewCard,
}: {
  game: GameState;
  onExit: () => void;
  onViewCard: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm bg-white/55 border-b border-washi-deep">
      <button onClick={onExit} className="text-sumi-soft hover:text-sumi font-medium">
        ← Exit
      </button>
      <span className="text-sumi-soft text-xs">
        Wall {game.wall.length} · {game.phase === 'charleston' ? 'Charleston' : 'Playing'}
      </span>
      <button
        onClick={onViewCard}
        className="chip bg-koi text-white border-koi-deep px-3 py-1 text-sm shadow-soft active:scale-95"
      >
        🎴 Card
      </button>
    </div>
  );
}

function CardOverlay({ game, onClose }: { game: GameState; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 bg-sumi/30 flex flex-col" onClick={onClose}>
      <div
        className="mt-auto bg-washi-soft rounded-t-3xl max-h-[85%] flex flex-col animate-pop shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-washi-deep">
          <h2 className="font-bold text-sumi-deep">🎴 {game.card.name}</h2>
          <button onClick={onClose} className="btn-soft px-4 py-1.5 text-sm">
            Close
          </button>
        </div>
        <div className="overflow-y-auto no-scrollbar px-4 py-3">
          <CardHandsList card={game.card} />
        </div>
      </div>
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
      className={`rounded-2xl p-2 border text-center transition ${
        active ? 'border-koi bg-koi/15 shadow-soft' : 'border-washi-deep bg-white/50'
      }`}
    >
      <div className="font-semibold text-sm truncate text-sumi">{player.name}</div>
      <div className="text-xs text-sumi-soft">{player.concealed.length} tiles</div>
      <div className="flex flex-wrap gap-0.5 justify-center mt-1 min-h-[1rem]">
        {player.exposures.flatMap((e, ei) =>
          e.tiles.map((t, ti) => <Tile key={`${ei}-${ti}`} tile={t} size="sm" />),
        )}
      </div>
    </div>
  );
}

function Center({ game }: { game: GameState }) {
  const callPrompt = useStore((s) => s.callPrompt);
  const claimable = !!callPrompt && (callPrompt.canMahjong || callPrompt.counts.length > 0);

  return (
    <div className="flex-1 min-h-0 px-3 py-2 flex flex-col">
      <div className="text-xs uppercase tracking-wider text-sumi-soft mb-1">
        Discards
        {claimable && (
          <span className="text-koi-deep normal-case"> · the glowing tile is yours to claim below</span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="flex flex-wrap gap-1 content-start">
          {game.discards.map((t, i) => {
            const isLast = i === game.discards.length - 1 && !!game.lastDiscard;
            return (
              <Tile
                key={t.id}
                tile={t}
                size="sm"
                className={
                  isLast ? (claimable ? 'ring-2 ring-koi animate-pop' : 'ring-2 ring-koi') : ''
                }
              />
            );
          })}
          {game.discards.length === 0 && (
            <span className="text-sumi-soft/70 text-sm">No discards yet.</span>
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
      <div className="bg-white/65 border-t border-washi-deep px-2 pt-2 pb-3 space-y-2">
        <CharlestonControls />
      </div>
    );
  }

  return (
    <div className="bg-white/65 border-t border-washi-deep px-2 pt-2 pb-3 space-y-2">
      {/* coaching hint */}
      {best && game.phase === 'play' && (
        <div className="text-center text-xs text-sumi-soft">
          Closest: <span className="text-koi-deep font-semibold">{best.hand.name}</span> ·{' '}
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
            onClick={myTurn ? () => setSelected((cur) => (cur === t.id ? null : t.id)) : undefined}
          />
        ))}
      </div>

      {/* action area */}
      {callPrompt ? (
        <CallControls />
      ) : (
        <div className="flex gap-2">
          {selfDrawWin && (
            <button onClick={declareSelfDraw} className="flex-1 py-3 btn-primary animate-pop">
              Declare Mahjong! 🀄
            </button>
          )}
          {swaps.length > 0 && (
            <button
              onClick={() => jokerExchange(swaps[0].targetSeat, swaps[0].exposureIdx, swaps[0].tileId)}
              className="px-4 py-3 rounded-full bg-sakura-soft text-sakura-deep border border-sakura font-semibold text-sm"
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
            className={`flex-1 py-3 rounded-full font-black transition ${
              myTurn && selected
                ? 'bg-matcha text-white shadow-soft active:scale-95'
                : 'bg-washi-deep/60 text-sumi-soft'
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

  const [picked, setPicked] = useState<string[]>([]);
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
      <div className="text-center text-sm text-sumi">
        Pass <span className="font-bold text-koi-deep uppercase">{dir}</span> — pick 3 tiles ({picked.length}/3)
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
          <button onClick={onStop} className="px-4 py-3 btn-soft">
            Stop
          </button>
        )}
        <button
          disabled={picked.length !== 3}
          onClick={() => {
            onSubmit(picked);
            setPicked([]);
          }}
          className={`flex-1 py-3 rounded-full font-black transition ${
            picked.length === 3 ? 'bg-matcha text-white shadow-soft active:scale-95' : 'bg-washi-deep/60 text-sumi-soft'
          }`}
        >
          Pass {dir}
        </button>
      </div>
    </div>
  );
}

const SIZE_NAME: Record<number, string> = { 3: 'Pung', 4: 'Kong', 5: 'Quint' };

function CallControls() {
  const game = useStore((s) => s.game)!;
  const prompt = useStore((s) => s.callPrompt)!;
  const callExposure = useStore((s) => s.humanCallExposure);
  const callMahjong = useStore((s) => s.humanCallMahjong);
  const pass = useStore((s) => s.humanPassCall);
  const tile = game.lastDiscard?.tile;
  const fromName = game.lastDiscard ? game.players[game.lastDiscard.seat].name : '';
  const canClaim = prompt.canMahjong || prompt.counts.length > 0;

  // How many of MY tiles match the discard, so each option can show its real
  // joker cost. To make a group of `size`, I use the discard + (size-1) tiles
  // from hand: naturals first, jokers only for the rest.
  const me = game.players[0];
  const key = tile ? tileKey(tile) : '';
  const naturals = tile ? me.concealed.filter((t) => !isJoker(t) && tileKey(t) === key).length : 0;
  const jokerCost = (size: number) => Math.max(0, size - 1 - naturals);

  // Only the legal sizes (already validated against the card), smallest first.
  const sizes = prompt.counts;

  return (
    <div className="space-y-2 animate-pop">
      {canClaim ? (
        <div className="rounded-xl bg-koi/15 border border-koi px-3 py-2 text-center">
          <div className="font-bold text-koi-deep text-sm">
            ✋ Take {tile ? tileLabel(tile) : 'this tile'}? Choose what to make — or keep going.
          </div>
          <div className="text-xs text-sumi-soft">Each option shows if it spends any of your jokers.</div>
        </div>
      ) : (
        <div className="rounded-xl bg-washi border border-washi-deep px-3 py-2 text-center">
          <div className="font-semibold text-sumi text-sm">
            {fromName} discarded {tile ? tileLabel(tile) : ''} — you can't take this one.
          </div>
          <div className="text-xs text-sumi-soft">
            You can only claim a discard to make a pung/kong (3+), and you'd need a matching tile.
            Tap “Keep going.”
          </div>
        </div>
      )}

      {canClaim && (
        <div className="space-y-1.5">
          {prompt.canMahjong && (
            <button onClick={callMahjong} className="w-full py-3 btn-primary">
              🀄 Mahjong — win with this tile!
            </button>
          )}
          {sizes.map((size) => {
            const cost = jokerCost(size);
            return (
              <button
                key={size}
                onClick={() => callExposure(size)}
                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-between px-4 border ${
                  cost === 0
                    ? 'bg-sora text-white border-sora-deep shadow-soft'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                <span>
                  {SIZE_NAME[size]} <span className="font-normal opacity-80">· {size} tiles</span>
                </span>
                <span className={`text-xs ${cost === 0 ? 'opacity-90' : 'font-semibold'}`}>
                  {cost === 0 ? 'no jokers' : `⚠ uses ${cost} joker${cost > 1 ? 's' : ''}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={pass}
        className="w-full py-3 rounded-full bg-matcha text-white font-black shadow-soft active:scale-95"
      >
        Keep going ▸
      </button>
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
    <div className="absolute inset-0 z-40 bg-sumi/40 flex items-center justify-center p-6">
      <div className="bg-washi-soft border border-washi-deep rounded-3xl p-6 w-full max-w-sm text-center space-y-4 animate-pop shadow-soft">
        <div className="text-5xl">{won ? '🌸' : game.result === 'wall' ? '🍃' : '🀄'}</div>
        <h2 className="text-2xl font-black text-sumi-deep">
          {won ? 'You win!' : game.result === 'wall' ? 'Wall game' : `${game.players[game.winner!.seat].name} wins`}
        </h2>
        {coaching && <p className="text-sumi-soft text-sm">{coaching}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={newGame} className="flex-1 py-3 btn-soft">
            Home
          </button>
          <button onClick={startGame} className="flex-1 py-3 btn-primary">
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
