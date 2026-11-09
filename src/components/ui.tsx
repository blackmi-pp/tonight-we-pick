import type { ReactNode } from 'react';

/** Studio palette (mirrors the CSS tokens) for places that need colours in JS, like SVG. */
export const COLORS = {
  ink: '#1e2226',
  paper: '#fbfbfa',
  surface: '#eef0f1',
  wall: '#b9c5cd',
  mute: '#79828a',
};

export function Card({
  label,
  right,
  children,
  className = '',
  bodyClass = 'card-body',
}: {
  label?: ReactNode;
  right?: ReactNode;
  /** @deprecated kept so older call sites compile; cards no longer have coloured shadows. */
  shadow?: string;
  /** @deprecated see `shadow`. */
  tab?: string;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {label !== undefined && (
        <h3 className="card-label">
          <span>{label}</span>
          {right !== undefined && <span>{right}</span>}
        </h3>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Btn({
  children,
  onClick,
  color = 'pink',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: 'pink' | 'yellow' | 'green';
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`btn ${color}`} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
    </button>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T | undefined | null;
  onChange: (v: T | undefined) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="pills">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="pill"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? undefined : o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function initial(name: string): string {
  if (!name) return '';
  return /^[\x00-\x7F]/.test(name) ? name.slice(0, 2) : name.slice(0, 1);
}
