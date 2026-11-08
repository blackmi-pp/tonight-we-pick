import type { Person } from '../engine/types';

/** Person colours: muted toy-paint tones that sit on the studio wall without shouting. */
export const PERSON_COLORS = ['#e07a5f', '#e9b44c', '#7fb069', '#5b8def', '#9b7ede', '#d77fa1', '#3f4a54'] as const;

export const ANIMALS = {
  cat: '貓',
  dog: '狗',
  rabbit: '兔',
  fox: '狐狸',
  bear: '熊',
  penguin: '企鵝',
  shiba: '柴犬',
  frog: '青蛙',
  koala: '樹熊',
  monkey: '馬騮',
} as const;
export type Animal = keyof typeof ANIMALS;
export const ANIMAL_KEYS = Object.keys(ANIMALS) as Animal[];

export interface Profile {
  color: string;
  animal: Animal;
}

export const DEFAULT_PROFILES: Record<Person, Profile> = {
  A: { color: PERSON_COLORS[0], animal: 'fox' },
  B: { color: PERSON_COLORS[3], animal: 'rabbit' },
};

export function sanitizeProfile(raw: unknown, fallback: Profile): Profile {
  if (typeof raw !== 'object' || raw === null) return { ...fallback };
  const r = raw as Record<string, unknown>;
  const color = typeof r.color === 'string' && (PERSON_COLORS as readonly string[]).includes(r.color) ? r.color : fallback.color;
  const animal = typeof r.animal === 'string' && r.animal in ANIMALS ? (r.animal as Animal) : fallback.animal;
  return { color, animal };
}

/**
 * Illustrated avatars. Drop `src/assets/animals/<key>.webp|png` in and it is picked up;
 * until then the avatar falls back to a coloured disc with the animal's first character.
 */
const files = import.meta.glob<string>('../assets/animals/*.{webp,png}', { eager: true, import: 'default' });
export const ANIMAL_IMG: Partial<Record<Animal, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.(webp|png)$/, ''), url]),
);
