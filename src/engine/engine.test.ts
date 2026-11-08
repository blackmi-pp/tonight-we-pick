import { describe, expect, it } from 'vitest';
import { RULES } from '../data/rules';
import { assignChore, skipCardsLeft, startOfWeek, weeklyScores } from './chores';
import { buildReasons } from './reasons';
import type { HistoryEntry } from './types';
import { DAY_MS, computeWeights } from './weights';
import { sliceUnderPointer, slicesFor, targetRotation } from './wheel';

const NOW = new Date(2026, 10, 7, 19, 0, 0).getTime(); // Sat 7 Nov 2026, local time

describe('wheel geometry', () => {
  it('slice sizes are proportional to probability', () => {
    const s = slicesFor([0.5, 0.25, 0.25]);
    expect(s.map((x) => x.end - x.start)).toEqual([180, 90, 90]);
    expect(s[2]!.end).toBeCloseTo(360);
  });

  it('the target rotation always lands inside the winning slice', () => {
    const slices = slicesFor([0.6, 0.05, 0.35]);
    for (const current of [0, 17, 359, 1234.5, 3600]) {
      for (const r of [0, 0.3, 0.5, 0.99]) {
        for (let i = 0; i < slices.length; i++) {
          const rot = targetRotation(current, slices[i]!, () => r);
          expect(sliceUnderPointer(rot, slices)).toBe(i);
          expect(rot - current).toBeGreaterThanOrEqual(5 * 360);
        }
      }
    }
  });
});

describe('reasons', () => {
  it('only states facts the engine used, including the real day count', () => {
    const history: HistoryEntry[] = [{ id: '1', kind: 'pick', category: 'eat', option: '火鍋', ts: NOW - 40 * DAY_MS }];
    const votes = { A: { 火鍋: 'love' as const }, B: { 火鍋: 'yes' as const } };
    const rows = computeWeights({
      category: 'eat',
      options: ['火鍋', '西餐'],
      votes,
      conditions: { 今日狀態: '慶祝一下' },
      history,
      rules: RULES.eat,
      now: NOW,
    });
    const reasons = buildReasons({ category: 'eat', winner: rows[0]!, rows, votes, names: { A: 'Bo', B: 'Kit' } });
    expect(reasons[0]).toMatch(/^中獎機率 \d+%（2 個選項入面排第 1）$/);
    expect(reasons).toContain('Bo 投咗「好想」');
    expect(reasons).toContain('已經 40 日冇食，機率有加成');
    expect(reasons.some((r) => r.includes('夠隆重'))).toBe(true);
  });

  it('says honestly when there is no history', () => {
    const rows = computeWeights({ category: 'go', options: ['海邊'], history: [], rules: RULES.go, now: NOW });
    const reasons = buildReasons({ category: 'go', winner: rows[0]!, rows, names: { A: 'A', B: 'B' } });
    expect(reasons).toContain('紀錄入面仲未去過呢個');
  });
});

describe('chores fairness engine', () => {
  const chore = (who: 'A' | 'B', pts: number, daysAgo: number, name = '洗碗'): HistoryEntry => ({
    id: `${who}${daysAgo}${name}`,
    kind: 'chore',
    chore: name,
    who,
    pts,
    ts: NOW - daysAgo * DAY_MS,
  });

  it('week starts on Monday', () => {
    expect(new Date(startOfWeek(NOW)).getDay()).toBe(1);
    expect(new Date(startOfWeek(NOW)).getDate()).toBe(2);
  });

  it('weekly scores ignore last week', () => {
    const h = [chore('A', 10, 1), chore('B', 30, 8)];
    expect(weeklyScores(h, NOW)).toEqual({ A: 10, B: 0 });
  });

  it('fewer points this week gets the chore', () => {
    const r = assignChore({ chore: '洗碗', history: [chore('A', 10, 1)], now: NOW, situation: 'none' });
    expect(r.who).toBe('B');
    expect(r.reason.kind).toBe('fewerPoints');
  });

  it('tie → whoever did this chore longer ago (never = longest)', () => {
    const h = [chore('A', 10, 20), chore('B', 10, 9)]; // both last week → tie at 0
    expect(assignChore({ chore: '洗碗', history: h, now: NOW, situation: 'none' }).who).toBe('A');
    const h2 = [chore('B', 10, 9)];
    expect(assignChore({ chore: '洗碗', history: h2, now: NOW, situation: 'none' }).who).toBe('A');
  });

  it('full tie → coin flip uses the rng', () => {
    expect(assignChore({ chore: '洗碗', history: [], now: NOW, situation: 'none', rand: () => 0.1 }).who).toBe('A');
    expect(assignChore({ chore: '洗碗', history: [], now: NOW, situation: 'none', rand: () => 0.9 }).who).toBe('B');
  });

  it('OT / unwell and both-tired situations', () => {
    expect(assignChore({ chore: '洗碗', history: [], now: NOW, situation: 'A' }).who).toBe('B');
    expect(assignChore({ chore: '洗碗', history: [], now: NOW, situation: 'both' }).who).toBeNull();
  });

  it('skip cards: 2 per calendar month', () => {
    const used: HistoryEntry[] = [
      { id: 's1', kind: 'skipCard', who: 'A', chore: '洗碗', ts: NOW - DAY_MS },
      { id: 's2', kind: 'skipCard', who: 'A', chore: '洗碗', ts: NOW - 2 * DAY_MS },
      { id: 's3', kind: 'skipCard', who: 'B', chore: '洗碗', ts: NOW - 10 * DAY_MS }, // 28 Oct → last month
    ];
    expect(skipCardsLeft(used, NOW)).toEqual({ A: 0, B: 2 });
  });
});
