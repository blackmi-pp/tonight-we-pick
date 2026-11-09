import { Mascot } from '../components/Mascot';
import { Card } from '../components/ui';
import { CATEGORY_LABEL, CATEGORY_TAG, RULES } from '../data/rules';
import { compromiseBoost, ledger } from '../engine/fairness';
import { relDay } from '../engine/time';
import type { Category, HistoryEntry } from '../engine/types';
import { useApp } from '../store/AppContext';

function describe(h: HistoryEntry, names: Record<'A' | 'B', string>): { tag: string; what: string } {
  switch (h.kind) {
    case 'pick':
      return { tag: CATEGORY_TAG[h.category], what: h.option + (h.rating === 'up' ? '・好' : h.rating === 'down' ? '・唔好' : '') };
    case 'chore':
      return {
        tag: '家務',
        what: `${h.chore} — ${names[h.who]}（+${h.pts}${h.via === 'swap' ? '・交換' : h.via === 'skipCard' ? '・對方用卡' : h.via === 'duel' ? '・對決輸咗' : ''}）`,
      };
    case 'skipCard':
      return { tag: '免做卡', what: `${names[h.who]} 用卡避開${h.chore}` };
  }
}

function cooldownSummary(cat: Category, options: string[]): string | null {
  const r = RULES[cat];
  if (r.cooldownDays === 0 && Object.keys(r.cooldownOverrides).length === 0) return null;
  const special = options.filter((o) => r.cooldownOverrides[o] !== undefined).map((o) => `${o} ${r.cooldownOverrides[o]} 日`);
  const base = `其他 ${r.cooldownDays} 日`;
  const gap = r.longGapDays ? `；${r.longGapDays} 日冇揀會加成` : '';
  return `${CATEGORY_LABEL[cat]}：${[...special, base].join('・')}${gap}`;
}

const CAT_ORDER: Category[] = ['eat', 'go', 'watch', 'custom'];

export function History() {
  const { data, names, removeHistory, update } = useApp();
  const now = Date.now();
  const summaries = (['eat', 'go', 'watch'] as const)
    .map((c) => cooldownSummary(c, data.options[c]))
    .filter((s): s is string => !!s);
  const l = ledger(data.history, now);
  const boost = compromiseBoost(l);
  const counts = CAT_ORDER.map((c) => ({ c, n: data.history.filter((h) => h.kind === 'pick' && h.category === c).length }));
  const max = Math.max(1, ...counts.map((x) => x.n));

  return (
    <div className="narrow">
      <h1 className="page-title">紀錄</h1>

      {l.n > 0 && (
        <Card>
          <div className="ledger">
            <Mascot mood={boost ? 'sideEye' : 'idle'} size={72} />
            <p>
              {boost
                ? `${names[boost.who]} 最近遷就多咗，下次投票佢嘅票會加成`
                : `最近 ${l.n} 次決定，兩個人差唔多開心`}
            </p>
          </div>
        </Card>
      )}

      {counts.some((x) => x.n > 0) && (
        <div>
          <div className="section-title">邊樣最常爭</div>
          <div className="cat-bars">
            {counts.map(({ c, n }) => (
              <div key={c}>
                <div className="top">
                  <span>{CATEGORY_LABEL[c]}</span>
                  <span>{n} 次</span>
                </div>
                <div className="bar" style={{ height: 6 }}>
                  <i style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="section-title">最近</div>
        {data.history.length === 0 ? (
          <div className="handoff">
            <Mascot mood="think" size={110} />
            <span className="sub">未有紀錄</span>
          </div>
        ) : (
          <div className="list">
            {data.history.slice(0, 200).map((h) => {
              const d = describe(h, names);
              return (
                <div key={h.id} className="li">
                  <span className="tag">{d.tag}</span>
                  <span className="grow">{d.what}</span>
                  <span className="meta">{relDay(h.ts, now)}</span>
                  <button type="button" className="x" aria-label="刪走呢條紀錄" onClick={() => removeHistory(h.id)}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {summaries.length > 0 && (
          <details className="explain" style={{ marginTop: 12 }}>
            <summary>冷卻期點計？</summary>
            <p className="note">
              期內只係降低機率，唔係禁止，由接受結果嗰日起計。
              <br />
              {summaries.map((s) => (
                <span key={s}>
                  {s}
                  <br />
                </span>
              ))}
            </p>
          </details>
        )}
      </div>

      <Card label="想睇">
        {data.watchlist.length === 0 ? (
          <span className="sub">未有</span>
        ) : (
          <div className="list">
            {data.watchlist.map((w) => (
              <div key={w} className="li">
                <span className="grow">{w}</span>
                <button
                  type="button"
                  className="x"
                  aria-label={`刪走 ${w}`}
                  onClick={() => update((d) => ({ ...d, watchlist: d.watchlist.filter((x) => x !== w) }))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
