import type { CategoryRules } from '../data/rules';
import type { Category, Conditions, HistoryEntry, Person, Vote, Votes } from './types';

import { DAY_MS, calendarDaysAgo } from './time';

export { DAY_MS };

/** Points per vote. The two people's points are multiplied, so both loving it counts most. */
export const VOTE_POINTS: Record<Vote, number> = { love: 3, yes: 2, ok: 1, no: 0 };
/** No vote is treated like "可以接受". */
export const NO_VOTE_POINTS = 1;

/** Weight multiplier on the day an option was picked; ramps linearly to 1 at the end of its cooldown. */
export const COOLDOWN_FLOOR = 0.2;
/** Boost for an option not picked for `longGapDays` or more. */
export const LONG_GAP_BOOST = 1.3;
/** 「想試新嘢」: boost for options never picked or not in 30 days, damp for picks within 14 days. */
export const NOVELTY_BOOST = 1.5;
export const NOVELTY_DAMP = 0.6;

export interface ConditionEffect {
  group: string;
  answer: string;
  multiplier: number;
  says?: string;
}

export interface OptionWeight {
  option: string;
  /** Final (unnormalised) weight; 0 means vetoed. */
  weight: number;
  /** weight / sum of weights, 0..1. */
  probability: number;
  vetoedBy: Person[];
  voteFactor: number;
  conditionFactor: number;
  conditionEffects: ConditionEffect[];
  cooldownFactor: number;
  /** Whole days since this option was last accepted in this category, or null if never. */
  daysSinceLast: number | null;
  cooldownDays: number;
}

export interface WeightInput {
  category: Category;
  options: string[];
  votes?: Votes;
  conditions?: Conditions;
  history: HistoryEntry[];
  rules: CategoryRules;
  now: number;
  /** Options to leave out this round (e.g. the one just rerolled away). */
  exclude?: string[];
}

export function lastPickedAt(history: HistoryEntry[], category: Category, option: string): number | null {
  let latest: number | null = null;
  for (const h of history) {
    if (h.kind === 'pick' && h.category === category && h.option === option) {
      if (latest === null || h.ts > latest) latest = h.ts;
    }
  }
  return latest;
}

/** Whole calendar days between two timestamps (local time), never negative. */
export function daysBetween(earlier: number, later: number): number {
  return Math.max(0, calendarDaysAgo(earlier, later));
}

export function voteFactor(votes: Votes | undefined, option: string): { factor: number; vetoedBy: Person[] } {
  if (!votes) return { factor: 1, vetoedBy: [] };
  const vetoedBy: Person[] = [];
  let factor = 1;
  for (const p of ['A', 'B'] as const) {
    const v = votes[p][option];
    if (v === 'no') vetoedBy.push(p);
    factor *= v ? VOTE_POINTS[v] : NO_VOTE_POINTS;
  }
  return { factor: vetoedBy.length ? 0 : factor, vetoedBy };
}

export function cooldownFactor(
  daysSinceLast: number | null,
  cooldownDays: number,
  longGapDays: number,
): number {
  if (daysSinceLast === null) return 1;
  if (cooldownDays > 0 && daysSinceLast < cooldownDays) {
    return COOLDOWN_FLOOR + (1 - COOLDOWN_FLOOR) * (daysSinceLast / cooldownDays);
  }
  if (longGapDays > 0 && daysSinceLast >= longGapDays) return LONG_GAP_BOOST;
  return 1;
}

export function conditionEffects(
  rules: CategoryRules,
  conditions: Conditions | undefined,
  option: string,
  daysSinceLast: number | null,
): ConditionEffect[] {
  if (!conditions) return [];
  const tags = rules.optionTags[option];
  const effects: ConditionEffect[] = [];
  for (const group of rules.groups) {
    const answer = conditions[group.title];
    if (!answer) continue;
    const rule = group.answers[answer];
    if (!rule) continue;

    let m = 1;
    if (rule.novelty) {
      if (daysSinceLast === null || daysSinceLast >= 30) m *= NOVELTY_BOOST;
      else if (daysSinceLast < 14) m *= NOVELTY_DAMP;
    }
    if (tags && rule.tags) {
      let matched = false;
      for (const t of tags) {
        const tm = rule.tags[t];
        if (tm !== undefined) {
          m *= tm;
          matched = true;
        }
      }
      if (!matched && rule.others !== undefined) m *= rule.others;
    }
    if (m !== 1) effects.push({ group: group.title, answer, multiplier: m, says: rule.says });
  }
  return effects;
}

/**
 * The weighting engine: weight = votes × conditions × cooldown.
 * Probabilities are exactly what the wheel draws and shows as slice sizes.
 */
export function computeWeights(input: WeightInput): OptionWeight[] {
  const { category, options, votes, conditions, history, rules, now, exclude = [] } = input;
  const rows = options
    .filter((o) => !exclude.includes(o))
    .map((option): OptionWeight => {
      const last = lastPickedAt(history, category, option);
      const daysSinceLast = last === null ? null : daysBetween(last, now);
      const cdDays = rules.cooldownOverrides[option] ?? rules.cooldownDays;
      const { factor: vf, vetoedBy } = voteFactor(votes, option);
      const effects = conditionEffects(rules, conditions, option, daysSinceLast);
      const cf = effects.reduce((acc, e) => acc * e.multiplier, 1);
      const cdf = cooldownFactor(daysSinceLast, cdDays, rules.longGapDays);
      return {
        option,
        weight: vf * cf * cdf,
        probability: 0,
        vetoedBy,
        voteFactor: vf,
        conditionFactor: cf,
        conditionEffects: effects,
        cooldownFactor: cdf,
        daysSinceLast,
        cooldownDays: cdDays,
      };
    });
  const total = rows.reduce((s, r) => s + r.weight, 0);
  for (const r of rows) r.probability = total > 0 ? r.weight / total : 0;
  return rows;
}

/** Only the options that can actually win. */
export function eligible(rows: OptionWeight[]): OptionWeight[] {
  return rows.filter((r) => r.weight > 0);
}

/**
 * Weighted random draw. `rand` must return [0, 1) — injectable for tests.
 * Returns the index into `rows`, or -1 if nothing can win.
 */
export function drawIndex(rows: OptionWeight[], rand: () => number = Math.random): number {
  const total = rows.reduce((s, r) => s + r.weight, 0);
  if (total <= 0) return -1;
  let x = rand() * total;
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i]!.weight;
    if (w <= 0) continue;
    if (x < w) return i;
    x -= w;
  }
  // Floating point edge: fall back to the last eligible row.
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.weight > 0) return i;
  return -1;
}
