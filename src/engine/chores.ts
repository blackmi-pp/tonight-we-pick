import type { HistoryEntry, Person } from './types';

export const SKIP_CARDS_PER_MONTH = 2;

/** Monday 00:00 local time of the week containing `now`. */
export function startOfWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export function startOfMonth(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function weeklyScores(history: HistoryEntry[], now: number): Record<Person, number> {
  const from = startOfWeek(now);
  const s: Record<Person, number> = { A: 0, B: 0 };
  for (const h of history) if (h.kind === 'chore' && h.ts >= from && h.ts <= now) s[h.who] += h.pts;
  return s;
}

export function skipCardsLeft(history: HistoryEntry[], now: number): Record<Person, number> {
  const from = startOfMonth(now);
  const left: Record<Person, number> = { A: SKIP_CARDS_PER_MONTH, B: SKIP_CARDS_PER_MONTH };
  for (const h of history) if (h.kind === 'skipCard' && h.ts >= from && h.ts <= now) left[h.who] -= 1;
  return { A: Math.max(0, left.A), B: Math.max(0, left.B) };
}

export function lastDid(history: HistoryEntry[], chore: string, who: Person): number | null {
  let t: number | null = null;
  for (const h of history) {
    if (h.kind === 'chore' && h.chore === chore && h.who === who && (t === null || h.ts > t)) t = h.ts;
  }
  return t;
}

export function lastDone(history: HistoryEntry[], chore: string): { who: Person; ts: number } | null {
  let best: { who: Person; ts: number } | null = null;
  for (const h of history) {
    if (h.kind === 'chore' && h.chore === chore && (!best || h.ts > best.ts)) best = { who: h.who, ts: h.ts };
  }
  return best;
}

export type ChoreSituation = 'none' | 'A' | 'B' | 'both';

export type AssignReason =
  | { kind: 'postponed' }
  | { kind: 'sick'; sick: Person }
  | { kind: 'fewerPoints'; scores: Record<Person, number> }
  | { kind: 'didLessRecently'; scores: Record<Person, number>; otherLast: number | null; mineLast: number | null }
  | { kind: 'coinFlip'; scores: Record<Person, number> };

export interface Assignment {
  who: Person | null;
  reason: AssignReason;
}

const other = (p: Person): Person => (p === 'A' ? 'B' : 'A');

/**
 * Fairness engine:
 * 1. Someone OT / unwell → the other one. Both → postponed, no points.
 * 2. Otherwise fewer points this week (Mon–Sun) does it.
 * 3. Tie → whoever did THIS chore less recently (never counts as longest ago).
 * 4. Still tied → coin flip.
 */
export function assignChore(args: {
  chore: string;
  history: HistoryEntry[];
  now: number;
  situation: ChoreSituation;
  rand?: () => number;
}): Assignment {
  const { chore, history, now, situation, rand = Math.random } = args;
  if (situation === 'both') return { who: null, reason: { kind: 'postponed' } };
  if (situation === 'A' || situation === 'B') return { who: other(situation), reason: { kind: 'sick', sick: situation } };

  const scores = weeklyScores(history, now);
  if (scores.A !== scores.B) {
    return { who: scores.A < scores.B ? 'A' : 'B', reason: { kind: 'fewerPoints', scores } };
  }
  const la = lastDid(history, chore, 'A');
  const lb = lastDid(history, chore, 'B');
  if (la !== lb) {
    // null (never) is "longest ago".
    const who: Person = la === null ? 'A' : lb === null ? 'B' : la < lb ? 'A' : 'B';
    return {
      who,
      reason: { kind: 'didLessRecently', scores, mineLast: who === 'A' ? la : lb, otherLast: who === 'A' ? lb : la },
    };
  }
  return { who: rand() < 0.5 ? 'A' : 'B', reason: { kind: 'coinFlip', scores } };
}
