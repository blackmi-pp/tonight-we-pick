import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Conditions, HistoryEntry, Person, Votes } from '../engine/types';
import { clearAll, freshState, load, newId, save, type SavedState } from './storage';

export type Screen = 'setup' | 'home' | 'vote' | 'cond' | 'wheel' | 'result' | 'tasks' | 'lazy' | 'history';

/** One round of a wheel decision. Lives in memory only. */
export interface Round {
  category: Category;
  votes?: Votes;
  conditions: Conditions;
  /** Options taken out for this round by a reroll. */
  exclude: string[];
  rerolled: boolean;
  winner?: string;
  rotation: number;
}

interface Ctx {
  data: SavedState;
  update: (fn: (d: SavedState) => SavedState) => void;
  names: Record<Person, string>;
  screen: Screen;
  go: (s: Screen) => void;
  round: Round;
  setRound: (fn: (r: Round) => Round) => void;
  startRound: (category: Category) => void;
  addHistory: (e: DistributiveOmit<HistoryEntry, 'id' | 'ts'>, ts?: number) => void;
  removeHistory: (id: string) => void;
  resetAll: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  saveFailed: boolean;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}

const emptyRound = (category: Category): Round => ({
  category,
  conditions: {},
  exclude: [],
  rerolled: false,
  rotation: 0,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SavedState>(() => load());
  const [screen, setScreen] = useState<Screen>(() => (data.setupDone ? 'home' : 'setup'));
  const [round, setRoundState] = useState<Round>(() => emptyRound('eat'));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSaveFailed(!save(data));
  }, [data]);

  // Android back gesture / browser back moves between screens instead of leaving the app.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { screen?: Screen } | null)?.screen;
      setScreen(s ?? (data.setupDone ? 'home' : 'setup'));
    };
    window.history.replaceState({ screen }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback((s: Screen) => {
    setScreen((cur) => {
      if (cur !== s) window.history.pushState({ screen: s }, '');
      return s;
    });
    window.scrollTo({ top: 0 });
  }, []);

  const update = useCallback((fn: (d: SavedState) => SavedState) => setData(fn), []);
  const setRound = useCallback((fn: (r: Round) => Round) => setRoundState(fn), []);
  const startRound = useCallback((category: Category) => setRoundState(emptyRound(category)), []);

  const addHistory = useCallback<Ctx['addHistory']>((e, ts = Date.now()) => {
    setData((d) => ({ ...d, history: [{ ...e, id: newId(), ts } as HistoryEntry, ...d.history] }));
  }, []);
  const removeHistory = useCallback((id: string) => {
    setData((d) => ({ ...d, history: d.history.filter((h) => h.id !== id) }));
  }, []);

  const resetAll = useCallback(() => {
    clearAll();
    setData(freshState());
    setRoundState(emptyRound('eat'));
    setScreen('setup');
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const names = useMemo(
    () => ({ A: data.users.A.trim() || 'A', B: data.users.B.trim() || 'B' }),
    [data.users.A, data.users.B],
  );

  const value: Ctx = {
    data,
    update,
    names,
    screen,
    go,
    round,
    setRound,
    startRound,
    addHistory,
    removeHistory,
    resetAll,
    toast,
    toastMsg,
    saveFailed,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
