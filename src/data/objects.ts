import type { Category } from '../engine/types';

/**
 * Small toy-like objects shown on the home option cards. Drop
 * `src/assets/objects/obj-<category>.webp|png` in and it shows up; nothing renders until then.
 */
const files = import.meta.glob<string>('../assets/objects/*.{webp,png}', { eager: true, import: 'default' });
export const OBJECT_IMG: Partial<Record<Category, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/^obj-|\.(webp|png)$/g, ''), url]),
);
