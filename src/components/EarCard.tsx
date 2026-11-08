import type { CSSProperties, ReactNode } from 'react';

/** How keen someone is, which is how pricked-up the ears are. */
export type Perk = 'flat' | 'low' | 'neutral' | 'up' | 'high';

const TILT: Record<Perk, { r: number; y: number }> = {
  flat: { r: -78, y: 22 },
  low: { r: -34, y: 8 },
  neutral: { r: -12, y: 3 },
  up: { r: -2, y: -2 },
  high: { r: 6, y: -8 },
};

function Ear({ side }: { side: 'l' | 'r' }) {
  return (
    <svg className={`ear ear-${side}`} viewBox="0 0 40 40" aria-hidden="true">
      <path className="ear-out" d="M3 38C4 25 9 11 17 3.5c1.7-1.6 4-1.4 5.3.5C28 12 34 25 36 38z" />
      <path className="ear-in" d="M11 38c1-9 4.5-18 8.6-24 .5-.8 1.5-.8 2 0 3.8 6 6.6 15 7.4 24z" />
    </svg>
  );
}

/**
 * The app's signature: option cards wear a pair of cat ears that react to how much
 * people want the option. Only used for options, never for buttons or settings.
 */
export function EarCard({
  perk = 'neutral',
  tint,
  earColor,
  className = '',
  style,
  children,
  as = 'div',
  onClick,
  ariaLabel,
}: {
  perk?: Perk;
  /** Fill colour for ears and body; defaults to the card surface. */
  tint?: string;
  /** Inner-ear colour, e.g. the voter's own colour when they really want it. */
  earColor?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: 'div' | 'button';
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const t = TILT[perk];
  const vars = { '--ear-r': `${t.r}deg`, '--ear-y': `${t.y}px`, ...(tint ? { '--card-bg': tint } : {}), ...(earColor ? { '--ear-in': earColor } : {}), ...style } as CSSProperties;
  const inner = (
    <>
      <Ear side="l" />
      <Ear side="r" />
      <div className="ear-body">{children}</div>
    </>
  );
  return as === 'button' ? (
    <button type="button" className={`ear-card ${className}`} style={vars} onClick={onClick} aria-label={ariaLabel}>
      {inner}
    </button>
  ) : (
    <div className={`ear-card ${className}`} style={vars}>
      {inner}
    </div>
  );
}
