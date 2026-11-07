import { useEffect, useState } from 'react';
import sheet from '../assets/mascot-sheet.webp';

/** sipp. mascot sprite sheet: 8 columns × 11 rows of 192×208 frames. */
const CELL_W = 192;
const CELL_H = 208;
const COLS = 8;
const ROWS = 11;

export const MOODS = {
  idle: { row: 0, frames: 6, fps: 5 },
  runRight: { row: 1, frames: 8, fps: 12 },
  runLeft: { row: 2, frames: 8, fps: 12 },
  wave: { row: 3, frames: 4, fps: 6 },
  jump: { row: 4, frames: 5, fps: 8 },
  sleepy: { row: 5, frames: 8, fps: 4 },
  please: { row: 6, frames: 6, fps: 5 },
  think: { row: 7, frames: 6, fps: 4 },
  grumpy: { row: 8, frames: 6, fps: 5 },
  lookUp: { row: 9, frames: 8, fps: 7 },
  sideEye: { row: 10, frames: 8, fps: 5 },
} as const;

export type Mood = keyof typeof MOODS;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function Mascot({
  mood = 'idle',
  size = 96,
  once = false,
  className,
  label = 'sipp. 吉祥物',
}: {
  mood?: Mood;
  /** Rendered width in px; height keeps the frame ratio. */
  size?: number;
  /** Play once and hold the last frame (e.g. a jump), instead of looping. */
  once?: boolean;
  className?: string;
  label?: string;
}) {
  const m = MOODS[mood];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (prefersReducedMotion() || m.frames < 2) return;
    let f = 0;
    const id = window.setInterval(() => {
      f += 1;
      if (once && f >= m.frames - 1) {
        setFrame(m.frames - 1);
        window.clearInterval(id);
        return;
      }
      setFrame(f % m.frames);
    }, 1000 / m.fps);
    return () => window.clearInterval(id);
  }, [mood, once, m.frames, m.fps]);

  const scale = size / CELL_W;
  return (
    <div
      role="img"
      aria-label={label}
      className={className}
      style={{
        width: size,
        height: Math.round(CELL_H * scale),
        flex: 'none',
        backgroundImage: `url(${sheet})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${COLS * CELL_W * scale}px ${ROWS * CELL_H * scale}px`,
        backgroundPosition: `${-frame * CELL_W * scale}px ${-m.row * CELL_H * scale}px`,
      }}
    />
  );
}
