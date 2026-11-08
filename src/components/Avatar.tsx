import { ANIMAL_IMG, ANIMALS } from '../data/profiles';
import type { Person } from '../engine/types';
import { useApp } from '../store/AppContext';

/** A person's animal avatar on their own colour. */
export function Avatar({ p, size = 28 }: { p: Person; size?: number }) {
  const { data, names } = useApp();
  const { color, animal } = data.profiles[p];
  const img = ANIMAL_IMG[animal];
  return (
    <span
      className="avatar"
      role="img"
      aria-label={`${names[p]}（${ANIMALS[animal]}）`}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.42) }}
    >
      {img ? <img src={img} alt="" /> : ANIMALS[animal].slice(0, 1)}
    </span>
  );
}
