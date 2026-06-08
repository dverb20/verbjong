// Tile.tsx — a single rendered mahjong tile (pure CSS, no image assets).

import type { Tile as TileT } from '../engine/tiles';

const SUIT_COLOR: Record<string, string> = { bam: 'text-bam', crak: 'text-crak', dot: 'text-dot' };
const SUIT_MARK: Record<string, string> = { bam: 'Bam', crak: 'Crak', dot: 'Dot' };

const sizes = {
  sm: 'w-9 h-12 text-[13px] rounded-md',
  md: 'w-11 h-16 text-base rounded-lg',
  lg: 'w-14 h-20 text-xl rounded-xl',
};

export interface TileProps {
  tile: TileT;
  size?: keyof typeof sizes;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  className?: string;
}

/** Renders the glyph + label for a tile face. */
function TileFace({ tile }: { tile: TileT }) {
  switch (tile.kind) {
    case 'suit':
      return (
        <div className={`flex flex-col items-center justify-center leading-none ${SUIT_COLOR[tile.suit!]}`}>
          <span className="font-bold text-[1.5em]">{tile.rank}</span>
          <span className="text-[0.55em] uppercase tracking-wide opacity-80">{SUIT_MARK[tile.suit!]}</span>
        </div>
      );
    case 'wind':
      return <span className="font-extrabold text-sumi text-[1.4em]">{tile.wind}</span>;
    case 'dragon': {
      if (tile.dragon === 'red') return <span className="font-extrabold text-crak text-[1.4em]">中</span>;
      if (tile.dragon === 'green') return <span className="font-extrabold text-bam text-[1.4em]">發</span>;
      return (
        <span className="font-bold text-dot text-[0.7em] border-2 border-dot rounded px-1 leading-none">
          0
        </span>
      );
    }
    case 'flower':
      return <span className="text-[1.4em]">🌸</span>;
    case 'joker':
      return (
        <div className="flex flex-col items-center leading-none">
          <span className="text-[1.2em]">🃏</span>
          <span className="text-[0.5em] font-bold uppercase tracking-wide text-sakura-deep">Joker</span>
        </div>
      );
  }
}

export function Tile({ tile, size = 'md', selected, dimmed, onClick, faceDown, className = '' }: TileProps) {
  if (faceDown) {
    return (
      <div
        className={`${sizes[size]} shrink-0 bg-gradient-to-b from-matcha to-matcha-deep border border-matcha-deep shadow-tile ${className}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${sizes[size]} shrink-0 flex items-center justify-center bg-gradient-to-b from-washi-soft to-washi border border-washi-deep shadow-tile select-none transition-transform
        ${onClick ? 'active:scale-95 cursor-pointer' : 'cursor-default'}
        ${selected ? '-translate-y-2 ring-2 ring-sakura shadow-tile-lifted' : ''}
        ${dimmed ? 'opacity-40' : ''}
        ${className}`}
    >
      <TileFace tile={tile} />
    </button>
  );
}
