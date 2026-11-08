import { useMemo } from 'react';

const COLORS = ['#e9b44c', '#8fb8d8', '#e8957b', '#a9c98a', '#c5b3e6', '#1e2226'];

/** Pure-CSS confetti burst. Decorative only; hidden from screen readers and reduced-motion users. */
export function Confetti({ count = 46 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.6 + Math.random() * 1.2,
        rot: Math.random() * 720 - 360,
        drift: Math.random() * 80 - 40,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length]!,
        round: Math.random() < 0.3,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              height: b.round ? b.w : b.h,
              borderRadius: b.round ? '50%' : 2,
              background: b.color,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
              '--rot': `${b.rot}deg`,
              '--drift': `${b.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
