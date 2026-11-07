import { describe, expect, it } from 'vitest';
import { RULES } from '../data/rules';
import type { HistoryEntry, Votes } from './types';
import {
  COOLDOWN_FLOOR,
  DAY_MS,
  LONG_GAP_BOOST,
  computeWeights,
  cooldownFactor,
  drawIndex,
  voteFactor,
} from './weights';

const NOW = new Date('2026-11-07T19:00:00+08:00').getTime();
const pick = (option: string, daysAgo: number, category: 'eat' | 'go' = 'eat'): HistoryEntry => ({
  id: `${option}-${daysAgo}`,
  kind: 'pick',
  category,
  option,
  ts: NOW - daysAgo * DAY_MS,
});
const noVotes = (): Votes => ({ A: {}, B: {} });

describe('voteFactor', () => {
  it('multiplies both people’s points, unvoted counts as 可以接受', () => {
    const v: Votes = { A: { 火鍋: 'love' }, B: { 火鍋: 'yes' } };
    expect(voteFactor(v, '火鍋').factor).toBe(6);
    expect(voteFactor(v, '西餐').factor).toBe(1);
  });

  it('either veto removes the option and remembers who', () => {
    const v: Votes = { A: { 火鍋: 'love' }, B: { 火鍋: 'no' } };
    expect(voteFactor(v, '火鍋')).toMatchObject({ factor: 0, vetoedBy: ['B'], boosted: false });
  });

  it('no votes object → neutral', () => {
    expect(voteFactor(undefined, 'x').factor).toBe(1);
  });
});

describe('cooldownFactor', () => {
  it('is neutral when never picked', () => {
    expect(cooldownFactor(null, 5, 30)).toBe(1);
  });
  it('ramps from the floor on day 0 up to 1 at the end of the cooldown', () => {
    expect(cooldownFactor(0, 5, 30)).toBeCloseTo(COOLDOWN_FLOOR);
    expect(cooldownFactor(5, 5, 30)).toBe(1);
    const mid = cooldownFactor(2, 5, 30);
    expect(mid).toBeGreaterThan(COOLDOWN_FLOOR);
    expect(mid).toBeLessThan(1);
  });
  it('boosts after a long gap', () => {
    expect(cooldownFactor(30, 5, 30)).toBe(LONG_GAP_BOOST);
    expect(cooldownFactor(29, 5, 30)).toBe(1);
  });
  it('long-gap boost can be disabled', () => {
    expect(cooldownFactor(400, 1, 0)).toBe(1);
  });
});

describe('computeWeights', () => {
  const options = ['日本菜', '泰國菜', '火鍋', '西餐', '麥當勞', '屋企煮'];

  it('with no input every option is equal', () => {
    const rows = computeWeights({ category: 'eat', options, history: [], rules: RULES.eat, now: NOW });
    for (const r of rows) expect(r.probability).toBeCloseTo(1 / 6);
  });

  it('probabilities always sum to 1 when something is eligible', () => {
    const rows = computeWeights({
      category: 'eat',
      options,
      votes: { A: { 火鍋: 'love', 西餐: 'no' }, B: { 麥當勞: 'ok', 日本菜: 'yes' } },
      conditions: { 預算: '平價', 今日狀態: '趕時間' },
      history: [pick('日本菜', 1), pick('火鍋', 40)],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows.reduce((s, r) => s + r.probability, 0)).toBeCloseTo(1);
  });

  it('votes change the odds: love×love beats ok×ok by 9×', () => {
    const votes: Votes = { A: { 火鍋: 'love', 西餐: 'ok' }, B: { 火鍋: 'love', 西餐: 'ok' } };
    const rows = computeWeights({ category: 'eat', options: ['火鍋', '西餐'], votes, history: [], rules: RULES.eat, now: NOW });
    expect(rows[0]!.probability / rows[1]!.probability).toBeCloseTo(9);
  });

  it('a veto gives exactly 0%', () => {
    const rows = computeWeights({
      category: 'eat',
      options,
      votes: { A: { 火鍋: 'no' }, B: {} },
      history: [],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows.find((r) => r.option === '火鍋')!.probability).toBe(0);
  });

  it('conditions shift odds toward matching options', () => {
    const rows = computeWeights({
      category: 'eat',
      options,
      votes: noVotes(),
      conditions: { 預算: '平價' },
      history: [],
      rules: RULES.eat,
      now: NOW,
    });
    const p = (o: string) => rows.find((r) => r.option === o)!.probability;
    expect(p('麥當勞')).toBeGreaterThan(p('日本菜'));
    expect(p('日本菜')).toBeGreaterThan(p('西餐'));
  });

  it('自己煮 makes 屋企煮 the clear favourite', () => {
    const rows = computeWeights({
      category: 'eat',
      options,
      conditions: { 模式: '自己煮' },
      history: [],
      rules: RULES.eat,
      now: NOW,
    });
    const top = [...rows].sort((a, b) => b.probability - a.probability)[0]!;
    expect(top.option).toBe('屋企煮');
    expect(top.probability).toBeGreaterThan(0.5);
  });

  it('options the couple added themselves are untouched by tag rules', () => {
    const rows = computeWeights({
      category: 'eat',
      options: ['屋企煮', '樓下茶記'],
      conditions: { 模式: '自己煮', 預算: '豪華' },
      history: [],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows.find((r) => r.option === '樓下茶記')!.conditionFactor).toBe(1);
  });

  it('cooldown damps something eaten yesterday', () => {
    const rows = computeWeights({
      category: 'eat',
      options: ['日本菜', '泰國菜'],
      history: [pick('日本菜', 1)],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows[0]!.probability).toBeLessThan(rows[1]!.probability);
    expect(rows[0]!.daysSinceLast).toBe(1);
    expect(rows[0]!.cooldownDays).toBe(5);
  });

  it('cooldown only looks at its own category', () => {
    const rows = computeWeights({
      category: 'eat',
      options: ['日本菜', '泰國菜'],
      history: [pick('日本菜', 0, 'go')],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows[0]!.cooldownFactor).toBe(1);
  });

  it('uses the most recent pick, not the first one found', () => {
    const rows = computeWeights({
      category: 'eat',
      options: ['火鍋'],
      history: [pick('火鍋', 50), pick('火鍋', 2)],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows[0]!.daysSinceLast).toBe(2);
  });

  it('想試新嘢 prefers what you haven’t had lately', () => {
    const rows = computeWeights({
      category: 'eat',
      options: ['日本菜', '泰國菜'],
      conditions: { 今日狀態: '想試新嘢' },
      history: [pick('日本菜', 10)],
      rules: RULES.eat,
      now: NOW,
    });
    expect(rows[1]!.probability).toBeGreaterThan(rows[0]!.probability);
  });

  it('exclude removes an option for this round', () => {
    const rows = computeWeights({ category: 'eat', options, history: [], rules: RULES.eat, now: NOW, exclude: ['火鍋'] });
    expect(rows.map((r) => r.option)).not.toContain('火鍋');
    expect(rows).toHaveLength(5);
  });

  it('all vetoed → all zero, no NaN', () => {
    const rows = computeWeights({
      category: 'custom',
      options: ['a', 'b'],
      votes: { A: { a: 'no' }, B: { b: 'no' } },
      history: [],
      rules: RULES.custom,
      now: NOW,
    });
    expect(rows.every((r) => r.probability === 0)).toBe(true);
    expect(drawIndex(rows)).toBe(-1);
  });
});

describe('drawIndex', () => {
  const rows = computeWeights({
    category: 'custom',
    options: ['a', 'b', 'c'],
    votes: { A: { a: 'love', b: 'no' }, B: { a: 'yes' } },
    history: [],
    rules: RULES.custom,
    now: NOW,
  });
  // weights: a=6, b=0, c=1 → total 7

  it('maps rand to the right weighted bucket and never returns a vetoed option', () => {
    expect(drawIndex(rows, () => 0)).toBe(0);
    expect(drawIndex(rows, () => 5.99 / 7)).toBe(0);
    expect(drawIndex(rows, () => 6.01 / 7)).toBe(2);
    expect(drawIndex(rows, () => 0.999999)).toBe(2);
  });

  it('empirical frequencies match the shown probabilities', () => {
    let seed = 42;
    const rng = () => {
      // mulberry32
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const counts = [0, 0, 0];
    const N = 70_000;
    for (let i = 0; i < N; i++) counts[drawIndex(rows, rng)]!++;
    expect(counts[1]).toBe(0);
    expect(counts[0]! / N).toBeCloseTo(6 / 7, 2);
    expect(counts[2]! / N).toBeCloseTo(1 / 7, 2);
  });
});
