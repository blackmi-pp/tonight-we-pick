import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, freshState, load, migrateLegacy, sanitize, save } from './storage';

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
};

describe('storage', () => {
  it('round-trips', () => {
    const s = freshState();
    s.users = { A: 'Bo', B: 'Kit' };
    s.setupDone = true;
    s.history.push({ id: 'x', kind: 'pick', category: 'eat', option: '火鍋', ts: 1 });
    const store = mem();
    expect(save(s, store)).toBe(true);
    expect(load(store)).toEqual(s);
  });

  it('survives corrupt JSON and junk fields', () => {
    expect(load(mem({ [STORAGE_KEY]: '{not json' }))).toEqual(freshState());
    const s = sanitize({ users: 5, options: { eat: [1, 2] }, history: [{ kind: 'pick' }, null] });
    expect(s.users).toEqual({ A: '', B: '' });
    expect(s.options.eat).toEqual(freshState().options.eat);
    expect(s.history).toEqual([]);
  });

  it('keeps valid profiles and repairs broken ones', () => {
    const s = sanitize({
      profiles: { A: { color: '#9b7ede', animal: 'koala' }, B: { color: 'red', animal: 'dragon' } },
    });
    expect(s.profiles.A).toEqual({ color: '#9b7ede', animal: 'koala' });
    expect(s.profiles.B).toEqual(freshState().profiles.B);
    // Data saved before profiles existed still loads.
    expect(sanitize({ users: { A: 'Bo', B: 'Kit' } }).profiles).toEqual(freshState().profiles);
  });

  it('imports the old jdw-* data', () => {
    const old = mem({
      'jdw-setup': JSON.stringify({ users: { A: 'Bo', B: 'Kit' }, options: { eat: ['火鍋'], go: [], watch: [], custom: [] } }),
      'jdw-history': JSON.stringify([
        { tag: '食乜', what: '火鍋', when: '今日', rating: '—', ts: 200 },
        { tag: '家務', what: '洗碗 — Kit', when: '今日', rating: '—', ts: 100 },
        { tag: '食乜', what: 'no ts' },
      ]),
      'jdw-watchlist': JSON.stringify(['進擊的巨人']),
    });
    const s = migrateLegacy(old.getItem)!;
    expect(s.setupDone).toBe(true);
    expect(s.users.B).toBe('Kit');
    expect(s.options.eat).toEqual(['火鍋']);
    expect(s.watchlist).toEqual(['進擊的巨人']);
    expect(s.history).toHaveLength(2);
    expect(s.history[0]).toMatchObject({ kind: 'pick', option: '火鍋', ts: 200 });
    expect(s.history[1]).toMatchObject({ kind: 'chore', chore: '洗碗', who: 'B', pts: 10 });
    // load() prefers new key but falls back to migration
    expect(load(old).users.A).toBe('Bo');
  });
});
