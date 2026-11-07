import { describe, expect, it } from 'vitest';
import { RULES, rulesWithTags, tagsFor } from '../data/rules';
import { BOOST_MAX, compromiseBoost, ledger, pendingRating, ratingFactor } from './fairness';
import { DAY_MS } from './time';
import type { HistoryEntry, Vote } from './types';
import { computeWeights, voteFactor } from './weights';

const NOW = new Date(2026, 10, 7, 19, 0, 0).getTime();
let i = 0;
const pick = (a: Vote | undefined, b: Vote | undefined, daysAgo = 1, extra: Partial<HistoryEntry> = {}): HistoryEntry =>
  ({
    id: String(i++),
    kind: 'pick',
    category: 'eat',
    option: '火鍋',
    ts: NOW - daysAgo * DAY_MS,
    votes: { ...(a ? { A: a } : {}), ...(b ? { B: b } : {}) },
    ...extra,
  }) as HistoryEntry;

describe('遷就帳簿 ledger', () => {
  it('counts who was happier with each voted result', () => {
    const l = ledger([pick('love', 'ok'), pick('yes', 'ok'), pick('ok', 'ok')], NOW);
    expect(l).toEqual({ n: 3, balance: 3, happier: { A: 2, B: 0 }, ties: 1 });
  });

  it('ignores unvoted picks, chores and anything older than 60 days', () => {
    const h: HistoryEntry[] = [
      { id: 'x', kind: 'pick', category: 'eat', option: 'a', ts: NOW - DAY_MS },
      { id: 'c', kind: 'chore', chore: '洗碗', who: 'A', pts: 10, ts: NOW },
      pick('love', 'ok', 61),
    ];
    expect(ledger(h, NOW).n).toBe(0);
  });

  it('only the last 10 voted decisions count', () => {
    const h = [...Array.from({ length: 10 }, (_, k) => pick('ok', 'ok', k + 1)), pick('love', 'ok', 20)];
    expect(ledger(h, NOW).balance).toBe(0);
  });

  it('boosts whoever has been compromising, capped', () => {
    expect(compromiseBoost(ledger([pick('yes', 'ok')], NOW))).toBeNull(); // gap 1 = even
    const b = compromiseBoost(ledger([pick('love', 'ok'), pick('love', 'ok')], NOW))!;
    expect(b.who).toBe('B');
    expect(b.multiplier).toBeCloseTo(1.4);
    const many = Array.from({ length: 10 }, (_, k) => pick('ok', 'love', k + 1));
    expect(compromiseBoost(ledger(many, NOW))).toEqual({ who: 'A', multiplier: BOOST_MAX });
  });

  it('the boost stretches only the compromiser’s likes; 可以接受 stays 1', () => {
    const votes = { A: { x: 'love' as const, y: 'ok' as const }, B: {} };
    const boost = { who: 'A' as const, multiplier: 1.5 };
    expect(voteFactor(votes, 'x', boost)).toMatchObject({ factor: 4, boosted: true });
    expect(voteFactor(votes, 'y', boost)).toMatchObject({ factor: 1, boosted: false });
    expect(voteFactor(votes, 'x', { who: 'B', multiplier: 1.5 }).factor).toBe(3);
  });

  it('flows through computeWeights', () => {
    const votes = { A: { 火鍋: 'love' as const }, B: { 西餐: 'love' as const } };
    const base = computeWeights({ category: 'eat', options: ['火鍋', '西餐'], votes, history: [], rules: RULES.eat, now: NOW });
    expect(base[0]!.probability).toBeCloseTo(0.5);
    const boosted = computeWeights({
      category: 'eat', options: ['火鍋', '西餐'], votes, history: [], rules: RULES.eat, now: NOW,
      boost: { who: 'B', multiplier: 1.5 },
    });
    expect(boosted[1]!.probability).toBeGreaterThan(0.55);
    expect(boosted[1]!.boosted?.who).toBe('B');
  });
});

describe('ratings', () => {
  it('👎 lowers and 👍 raises, last three only, clamped', () => {
    expect(ratingFactor([pick(undefined, undefined, 1, { rating: 'down' } as never)], 'eat', '火鍋').factor).toBeCloseTo(0.6);
    expect(ratingFactor([pick(undefined, undefined, 1, { rating: 'up' } as never)], 'eat', '火鍋').factor).toBeCloseTo(1.15);
    const downs = Array.from({ length: 5 }, (_, k) => pick(undefined, undefined, k, { rating: 'down' } as never));
    expect(ratingFactor(downs, 'eat', '火鍋')).toMatchObject({ factor: 0.3, downs: 3 });
    expect(ratingFactor(downs, 'eat', '西餐').factor).toBe(1);
  });

  it('asks about the last pick after 2 hours, not custom, not twice', () => {
    const fresh: HistoryEntry = { id: 'f', kind: 'pick', category: 'eat', option: 'a', ts: NOW - 60 * 60 * 1000 };
    expect(pendingRating([fresh], NOW)).toBeNull();
    const old = { ...fresh, ts: NOW - 3 * 60 * 60 * 1000 };
    expect(pendingRating([old], NOW)?.id).toBe('f');
    expect(pendingRating([{ ...old, rating: 'up' }], NOW)).toBeNull();
    expect(pendingRating([{ ...old, category: 'custom' }], NOW)).toBeNull();
  });
});

describe('own tags', () => {
  it('conditions work on the couple’s own options once tagged', () => {
    const tags = { eat: { 樓下茶記: ['cheap', 'near', 'fast'] } };
    expect(tagsFor('eat', '樓下茶記', tags)).toEqual(['cheap', 'near', 'fast']);
    const rows = computeWeights({
      category: 'eat', options: ['樓下茶記', '西餐'], conditions: { 預算: '平價' }, history: [],
      rules: rulesWithTags('eat', tags), now: NOW,
    });
    expect(rows[0]!.conditionFactor).toBeCloseTo(1.6);
  });

  it('own tags override built-in ones', () => {
    expect(tagsFor('eat', '火鍋', { eat: { 火鍋: ['cheap'] } })).toEqual(['cheap']);
    expect(tagsFor('eat', '火鍋', {})).toEqual(RULES.eat.optionTags['火鍋']);
  });
});
