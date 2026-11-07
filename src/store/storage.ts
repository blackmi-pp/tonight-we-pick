import { DEFAULT_CHORES, DEFAULT_OPTIONS, type UserTags } from '../data/rules';
import type { Category, Chore, HistoryEntry, Person } from '../engine/types';

export const STORAGE_KEY = 'twp:v1';
const HISTORY_LIMIT = 1000;

export interface SavedState {
  version: 1;
  setupDone: boolean;
  users: Record<Person, string>;
  options: Record<Category, string[]>;
  chores: Chore[];
  history: HistoryEntry[];
  watchlist: string[];
  /** The couple's own tags on options (overrides built-in tags). */
  tags: UserTags;
}

export function freshState(): SavedState {
  return {
    version: 1,
    setupDone: false,
    users: { A: '', B: '' },
    options: structuredClone(DEFAULT_OPTIONS),
    chores: structuredClone(DEFAULT_CHORES),
    history: [],
    watchlist: [],
    tags: {},
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const CATS: Category[] = ['eat', 'go', 'watch', 'custom'];
const VOTES = ['love', 'yes', 'ok', 'no'];
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const strArr = (x: unknown): string[] | null =>
  Array.isArray(x) && x.every((s) => typeof s === 'string') ? (x as string[]) : null;

function isHistoryEntry(x: unknown): x is HistoryEntry {
  if (!isObj(x) || typeof x.id !== 'string' || typeof x.ts !== 'number') return false;
  if (x.kind === 'pick') {
    if (!CATS.includes(x.category as Category) || typeof x.option !== 'string') return false;
    if (x.rating !== undefined && x.rating !== 'up' && x.rating !== 'down') return false;
    if (x.votes !== undefined) {
      if (!isObj(x.votes)) return false;
      for (const v of Object.values(x.votes)) if (!VOTES.includes(v as string)) return false;
    }
    return true;
  }
  if (x.kind === 'chore')
    return typeof x.chore === 'string' && (x.who === 'A' || x.who === 'B') && typeof x.pts === 'number';
  if (x.kind === 'skipCard') return (x.who === 'A' || x.who === 'B') && typeof x.chore === 'string';
  return false;
}

/** Validates loaded JSON field by field; anything broken falls back to defaults instead of crashing. */
export function sanitize(raw: unknown): SavedState {
  const base = freshState();
  if (!isObj(raw)) return base;
  const users = isObj(raw.users) ? raw.users : {};
  const options = isObj(raw.options) ? raw.options : {};
  const out: SavedState = {
    version: 1,
    setupDone: raw.setupDone === true,
    users: {
      A: typeof users.A === 'string' ? users.A : '',
      B: typeof users.B === 'string' ? users.B : '',
    },
    options: Object.fromEntries(CATS.map((c) => [c, strArr(options[c]) ?? base.options[c]])) as SavedState['options'],
    chores: Array.isArray(raw.chores)
      ? raw.chores.filter((c): c is Chore => isObj(c) && typeof c.name === 'string' && typeof c.pts === 'number')
      : base.chores,
    history: Array.isArray(raw.history) ? raw.history.filter(isHistoryEntry).slice(0, HISTORY_LIMIT) : [],
    watchlist: strArr(raw.watchlist) ?? [],
    tags: sanitizeTags(raw.tags),
  };
  return out;
}

function sanitizeTags(raw: unknown): UserTags {
  if (!isObj(raw)) return {};
  const out: UserTags = {};
  for (const c of CATS) {
    const m = raw[c];
    if (!isObj(m)) continue;
    const clean: Record<string, string[]> = {};
    for (const [opt, tags] of Object.entries(m)) {
      const t = strArr(tags);
      if (t) clean[opt] = t;
    }
    out[c] = clean;
  }
  return out;
}

/** Best-effort import of data saved by the old (v1, Claude Design) version under `jdw-*` keys. */
export function migrateLegacy(get: (k: string) => string | null): SavedState | null {
  const parse = (k: string): unknown => {
    try {
      const v = get(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  const setup = parse('jdw-setup');
  if (!isObj(setup) || !isObj(setup.users)) return null;

  const s = sanitize({ setupDone: true, users: setup.users, options: setup.options });
  const chores = parse('jdw-chores');
  if (Array.isArray(chores)) s.chores = sanitize({ chores }).chores;
  const watch = strArr(parse('jdw-watchlist'));
  if (watch) s.watchlist = watch;

  const tagToCat: Record<string, Category> = { 食乜: 'eat', 去邊: 'go', 睇乜: 'watch', 自訂: 'custom' };
  const oldHist = parse('jdw-history');
  if (Array.isArray(oldHist)) {
    for (const h of oldHist) {
      if (!isObj(h) || typeof h.ts !== 'number' || typeof h.what !== 'string' || typeof h.tag !== 'string') continue;
      const cat = tagToCat[h.tag];
      if (cat) {
        s.history.push({ id: newId(), kind: 'pick', category: cat, option: h.what, ts: h.ts });
      } else if (h.tag === '家務') {
        const [chore, name] = h.what.split(' — ');
        if (!chore || !name) continue;
        const who: Person | null = name === s.users.A ? 'A' : name === s.users.B ? 'B' : null;
        if (!who) continue;
        const pts = s.chores.find((c) => c.name === chore)?.pts ?? 10;
        s.history.push({ id: newId(), kind: 'chore', chore, who, pts, ts: h.ts });
      }
    }
    s.history.sort((a, b) => b.ts - a.ts);
  }
  return s;
}

export function load(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): SavedState {
  if (!storage) return freshState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
    return migrateLegacy((k) => storage.getItem(k)) ?? freshState();
  } catch {
    return freshState();
  }
}

export function save(state: SavedState, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, history: state.history.slice(0, HISTORY_LIMIT) }));
    return true;
  } catch {
    return false;
  }
}

export function clearAll(storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()): void {
  if (!storage) return;
  for (const k of [STORAGE_KEY, 'jdw-setup', 'jdw-history', 'jdw-scores', 'jdw-cards', 'jdw-chores', 'jdw-watchlist']) {
    try {
      storage.removeItem(k);
    } catch {
      /* private mode etc. */
    }
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}
