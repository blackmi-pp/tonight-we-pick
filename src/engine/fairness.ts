import type { Category, HistoryEntry, Person, Rating, Vote } from './types';
import { DAY_MS } from './time';

/** How happy someone was with a result, from their own vote on it. No vote = 1 (可以接受). */
export const SATISFACTION: Record<Vote, number> = { love: 3, yes: 2, ok: 1, no: 0 };

export const LEDGER_SIZE = 10;
export const LEDGER_DAYS = 60;
/** A balance below this is treated as even. */
export const LEDGER_THRESHOLD = 2;
export const BOOST_PER_POINT = 0.1;
export const BOOST_MAX = 1.5;

export interface Ledger {
  /** Decisions counted (most recent voted results). */
  n: number;
  /** Σ(satisfaction A − satisfaction B). Positive → A has been getting their way. */
  balance: number;
  happier: Record<Person, number>;
  ties: number;
}

/**
 * 遷就帳簿: over the last few voted decisions, who got what they wanted?
 * Only results that had a secret vote count, so a plain spin never moves the ledger.
 */
export function ledger(history: HistoryEntry[], now: number): Ledger {
  const out: Ledger = { n: 0, balance: 0, happier: { A: 0, B: 0 }, ties: 0 };
  const since = now - LEDGER_DAYS * DAY_MS;
  const voted = history
    .filter((h): h is Extract<HistoryEntry, { kind: 'pick' }> => h.kind === 'pick' && !!h.votes && h.ts >= since && h.ts <= now)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, LEDGER_SIZE);
  for (const h of voted) {
    const a = h.votes!.A ? SATISFACTION[h.votes!.A] : 1;
    const b = h.votes!.B ? SATISFACTION[h.votes!.B] : 1;
    out.n += 1;
    out.balance += a - b;
    if (a > b) out.happier.A += 1;
    else if (b > a) out.happier.B += 1;
    else out.ties += 1;
  }
  return out;
}

export interface Boost {
  /** The person who has been compromising and gets their votes amplified. */
  who: Person;
  multiplier: number;
}

export function compromiseBoost(l: Ledger): Boost | null {
  const gap = Math.abs(l.balance);
  if (gap < LEDGER_THRESHOLD) return null;
  return {
    who: l.balance > 0 ? 'B' : 'A',
    multiplier: Math.min(BOOST_MAX, 1 + BOOST_PER_POINT * gap),
  };
}

/** Ratings: 👍 nudges an option up, 👎 pushes it down. Last 3 ratings of the option count. */
export const RATING_MULT: Record<Rating, number> = { up: 1.15, down: 0.6 };
export const RATING_MIN = 0.3;
export const RATING_MAX = 1.4;

export function ratingFactor(history: HistoryEntry[], category: Category, option: string): { factor: number; ups: number; downs: number } {
  const rated = history
    .filter((h): h is Extract<HistoryEntry, { kind: 'pick' }> => h.kind === 'pick' && h.category === category && h.option === option && !!h.rating)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 3);
  let f = 1;
  let ups = 0;
  let downs = 0;
  for (const h of rated) {
    f *= RATING_MULT[h.rating!];
    if (h.rating === 'up') ups++;
    else downs++;
  }
  return { factor: Math.min(RATING_MAX, Math.max(RATING_MIN, f)), ups, downs };
}

/** The most recent accepted pick that still needs a 👍/👎, if it's from an earlier day or at least 2h old. */
export function pendingRating(history: HistoryEntry[], now: number): Extract<HistoryEntry, { kind: 'pick' }> | null {
  const last = history.find((h) => h.kind === 'pick');
  if (!last || last.kind !== 'pick' || last.rating) return null;
  if (last.category === 'custom') return null;
  if (now - last.ts < 2 * 60 * 60 * 1000) return null;
  if (now - last.ts > 7 * DAY_MS) return null;
  return last;
}
