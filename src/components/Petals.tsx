// Petals.tsx — a few cherry-blossom petals drifting down behind the UI.
// Purely decorative and non-interactive; respects the calm, light mood.

const PETALS = [
  { left: '8%', dur: 14, delay: 0, size: 16, char: '🌸' },
  { left: '24%', dur: 18, delay: 3, size: 13, char: '🌸' },
  { left: '47%', dur: 16, delay: 6, size: 18, char: '🌸' },
  { left: '68%', dur: 20, delay: 2, size: 14, char: '🌸' },
  { left: '85%', dur: 15, delay: 8, size: 16, char: '🌸' },
  { left: '58%', dur: 22, delay: 11, size: 12, char: '🌸' },
];

export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
