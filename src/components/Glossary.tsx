// Glossary.tsx — a gentle, beginner-friendly guide to the tiles and to reading
// a hand on the card. Shows the real tile faces next to plain-English notes.

import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { Tile } from './Tile';
import type { Tile as TileT } from '../engine/tiles';

let gid = 0;
const t = (base: Omit<TileT, 'id'>): TileT => ({ ...base, id: `gloss-${gid++}` });

function Row({ tiles, title, children }: { tiles: TileT[]; title: string; children: ReactNode }) {
  return (
    <div className="panel p-3 flex gap-3 items-center">
      <div className="flex gap-1 shrink-0">
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} size="sm" />
        ))}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sumi text-sm">{title}</div>
        <div className="text-xs text-sumi-soft leading-snug">{children}</div>
      </div>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-8 rounded-md border text-xs font-bold ${color}`}>
      {children}
    </span>
  );
}

function NoteRow({ chip, title, children }: { chip: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="panel p-3 flex gap-3 items-center">
      <div className="shrink-0">{chip}</div>
      <div className="min-w-0">
        <div className="font-semibold text-sumi text-sm">{title}</div>
        <div className="text-xs text-sumi-soft leading-snug">{children}</div>
      </div>
    </div>
  );
}

export function Glossary() {
  const setScreen = useStore((s) => s.setScreen);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-b border-washi-deep">
        <button onClick={() => setScreen('home')} className="text-sumi-soft hover:text-sumi">
          ← Back
        </button>
        <h2 className="font-bold text-sumi-deep">🌼 Symbols Guide</h2>
        <button onClick={() => setScreen('cards')} className="text-koi-deep text-sm font-semibold">
          Cards
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-5">
        {/* ---- The tiles -------------------------------------------------- */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-koi-deep font-bold">The tiles</h3>

          <Row
            title="The three suits — numbers 1 to 9"
            tiles={[
              t({ kind: 'suit', suit: 'bam', rank: 5 }),
              t({ kind: 'suit', suit: 'crak', rank: 5 }),
              t({ kind: 'suit', suit: 'dot', rank: 5 }),
            ]}
          >
            <span className="text-bam font-semibold">Bams</span> are green,{' '}
            <span className="text-crak font-semibold">Craks</span> are red,{' '}
            <span className="text-dot font-semibold">Dots</span> are blue. Four of every number.
          </Row>

          <Row
            title="The four winds"
            tiles={[
              t({ kind: 'wind', wind: 'N' }),
              t({ kind: 'wind', wind: 'E' }),
              t({ kind: 'wind', wind: 'W' }),
              t({ kind: 'wind', wind: 'S' }),
            ]}
          >
            North, East, West, South.
          </Row>

          <Row
            title="The three dragons"
            tiles={[
              t({ kind: 'dragon', dragon: 'red' }),
              t({ kind: 'dragon', dragon: 'green' }),
              t({ kind: 'dragon', dragon: 'white' }),
            ]}
          >
            Red (中), Green (發), and the white “Soap.” Soap also stands in for the number{' '}
            <strong>0</strong> in year hands.
          </Row>

          <Row title="Flowers" tiles={[t({ kind: 'flower' }), t({ kind: 'flower' })]}>
            Pretty bonus tiles used inside many hands (eight in the set).
          </Row>

          <Row title="Jokers — the wild tile" tiles={[t({ kind: 'joker' })]}>
            Can stand in for any tile, but <strong>only inside a group of three or more</strong> —
            never in a pair or a single.
          </Row>
        </section>

        {/* ---- Reading a hand --------------------------------------------- */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-koi-deep font-bold">
            Reading a hand on the card
          </h3>

          <NoteRow chip={<Chip color="bg-washi text-sumi border-washi-deep">5</Chip>} title="A number">
            A plain number means that exact tile (here, a 5).
          </NoteRow>

          <NoteRow
            chip={
              <div className="flex gap-0.5">
                <Chip color="bg-sakura-soft text-sakura-deep border-sakura">N</Chip>
                <Chip color="bg-sakura-soft text-sakura-deep border-sakura">N+1</Chip>
              </div>
            }
            title="N, N+1, N+2…"
          >
            “N” is <em>any</em> number you choose. “N+1” is the next one up — so N, N+1, N+2 is a run
            like 3-4-5.
          </NoteRow>

          <NoteRow
            chip={
              <div className="flex gap-0.5">
                <Chip color="bg-washi text-sumi border-washi-deep">F</Chip>
                <Chip color="bg-washi text-sumi border-washi-deep">0</Chip>
                <Chip color="bg-washi text-sumi border-washi-deep">D</Chip>
              </div>
            }
            title="Letters"
          >
            <strong>F</strong> = flower, <strong>0</strong> = soap, <strong>D</strong> /{' '}
            <strong>中發</strong> = dragons, <strong>N/E/W/S</strong> = winds.
          </NoteRow>

          <NoteRow
            chip={
              <div className="flex gap-0.5">
                <Chip color="bg-sakura-soft text-sakura-deep border-sakura">N</Chip>
                <Chip color="bg-sora-soft text-sora-deep border-sora">N</Chip>
                <Chip color="bg-matcha-soft text-matcha-deep border-matcha">N</Chip>
              </div>
            }
            title="The colours = how many suits"
          >
            <span className="text-sakura-deep font-semibold">Pink</span>,{' '}
            <span className="text-sora-deep font-semibold">blue</span> and{' '}
            <span className="text-matcha-deep font-semibold">green</span> are three{' '}
            <em>different</em> suits. Same colour = same suit. The colours are not the suit itself —
            you choose which suit goes where.
          </NoteRow>

          <NoteRow
            chip={
              <div className="flex gap-0.5">
                <Chip color="bg-washi text-sumi border-washi-deep">7</Chip>
                <Chip color="bg-washi text-sumi border-washi-deep">7</Chip>
                <Chip color="bg-washi text-sumi border-washi-deep">7</Chip>
              </div>
            }
            title="How many of a tile"
          >
            Two of a symbol = a pair, three = a pung, four = a kong, five = a quint. Jokers are
            allowed once you need three or more.
          </NoteRow>

          <NoteRow
            chip={<Chip color="bg-koi/20 text-koi-deep border-koi">C</Chip>}
            title="“Concealed”"
          >
            A concealed hand must stay hidden — you can't claim other players' discards to build it.
          </NoteRow>

          <NoteRow
            chip={<Chip color="bg-koi/20 text-koi-deep border-koi">25</Chip>}
            title="Points"
          >
            The score you earn if you win with that hand. Harder hands are worth more.
          </NoteRow>
        </section>

        <p className="text-center text-xs text-sumi-soft pb-2">
          Tip: during a game, tap the <span className="font-semibold text-koi-deep">🎴 Card</span>{' '}
          button any time to see all the hands.
        </p>
      </div>
    </div>
  );
}
