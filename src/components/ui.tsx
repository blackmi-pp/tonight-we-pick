import type { CSSProperties, ReactNode } from 'react';

export const COLORS = {
  ink: '#1c1a17',
  cream: '#f4eeda',
  yellow: '#ffd23f',
  pink: '#f2467f',
  green: '#a8d84b',
  teal: '#7fc8bd',
  orange: '#f2865e',
};

export function Card({
  label,
  right,
  shadow = COLORS.pink,
  tab = COLORS.yellow,
  children,
  className = '',
  bodyClass = 'card-body',
}: {
  label?: ReactNode;
  right?: ReactNode;
  shadow?: string;
  tab?: string;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card ${className}`} style={{ '--shadow': shadow, '--tab': tab } as CSSProperties}>
      <div className="card-in">
        {label !== undefined && (
          <div className="tab">
            <span className="dot" style={{ background: COLORS.pink }} />
            <span className="dot" style={{ background: COLORS.green }} />
            <span className="label">{label}</span>
            {right !== undefined && <span className="right">{right}</span>}
          </div>
        )}
        <div className={bodyClass}>{children}</div>
      </div>
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
