import type { Category, Person, Votes } from './types';
import type { OptionWeight } from './weights';

const VERB: Record<Category, string> = { eat: '食', go: '去', watch: '睇', custom: '揀' };

export function pct(p: number): string {
  if (p > 0 && p < 0.01) return '<1%';
  return `${Math.round(p * 100)}%`;
}

export function daysLabel(category: Category, days: number): string {
  const v = VERB[category];
  if (days === 0) return `今日${v}過`;
  if (days === 1) return `尋日${v}過`;
  return `${days} 日前${v}過`;
}

/**
 * Explains a result using only what the engine actually used: the two votes, the
 * conditions that changed the weight, and the real last-picked date from history.
 */
export function buildReasons(args: {
  category: Category;
  winner: OptionWeight;
  rows: OptionWeight[];
  votes?: Votes;
  names: Record<Person, string>;
}): string[] {
  const { category, winner, rows, votes, names } = args;
  const out: string[] = [];
  const v = VERB[category];

  // 1. Probability, straight from the engine.
  const live = rows.filter((r) => r.weight > 0);
  const rank = [...live].sort((a, b) => b.probability - a.probability).indexOf(winner) + 1;
  out.push(`中獎機率 ${pct(winner.probability)}（${live.length} 個選項入面排第 ${rank}）`);

  // 2. Votes.
  if (votes) {
    const a = votes.A[winner.option];
    const b = votes.B[winner.option];
    if (a === 'love' && b === 'love') out.push(`${names.A} 同 ${names.B} 都投咗「特別想」`);
    else if (a === 'love' || b === 'love') out.push(`${a === 'love' ? names.A : names.B} 投咗「特別想」`);
    else if (a && b) out.push('兩個人都接受呢個選項');
    else if (a || b) out.push(`${a ? names.A : names.B} 有投票，另一位冇反對`);
    else out.push('兩個都冇投票，亦冇人否決');
  }

  // 3. Cooldown / history.
  const d = winner.daysSinceLast;
  if (d === null) {
    out.push(`紀錄入面仲未${v}過呢個`);
  } else if (winner.cooldownFactor < 1) {
    out.push(`${daysLabel(category, d)}，仲喺 ${winner.cooldownDays} 日冷卻期，機率已經打咗折`);
  } else if (winner.cooldownFactor > 1) {
    out.push(`已經 ${d} 日冇${v}，機率有加成`);
  } else {
    out.push(`上次係 ${d} 日前`);
  }

  // 4. Conditions that actually moved the weight.
  const ups = winner.conditionEffects.filter((e) => e.multiplier > 1);
  const downs = winner.conditionEffects.filter((e) => e.multiplier < 1);
  if (ups.length) {
    out.push('符合今日條件：' + ups.map((e) => e.says ?? `${e.group}・${e.answer}`).join('、'));
  }
  if (downs.length) {
    out.push('其實唔太啱「' + downs.map((e) => e.answer).join('、') + '」，但轉盤都係揀咗佢');
  }

  return out.slice(0, 4);
}
