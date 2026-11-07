import { Mascot } from '../components/Mascot';
import { Card, COLORS } from '../components/ui';
import { CATEGORY_LABEL, CATEGORY_TAG, RULES } from '../data/rules';
import { relDay } from '../engine/time';
import type { Category, HistoryEntry } from '../engine/types';
import { useApp } from '../store/AppContext';

const TAG_COLOR: Record<string, string> = {
  食乜: COLORS.yellow,
  去邊: COLORS.green,
  睇乜: COLORS.teal,
  自訂: COLORS.orange,
  家務: COLORS.pink,
  免做卡: '#c78bde',
};

function describe(h: HistoryEntry, names: Record<'A' | 'B', string>): { tag: string; what: string } {
  switch (h.kind) {
    case 'pick':
      return { tag: CATEGORY_TAG[h.category], what: h.option + (h.rating === 'up' ? ' 👍' : h.rating === 'down' ? ' 👎' : '') };
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

export function History() {
  const { data, names, removeHistory, update } = useApp();
  const now = Date.now();
  const summaries = (['eat', 'go', 'watch'] as const)
    .map((c) => cooldownSummary(c, data.options[c]))
    .filter((s): s is string => !!s);

  return (
    <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Card label="決定歷史" shadow={COLORS.green}>
        {data.history.length === 0 ? (
          <div className="handoff">
            <Mascot mood="think" size={90} />
            <span className="note">仲未有紀錄・接受第一個結果之後就會記喺度</span>
          </div>
        ) : (
          <div className="list">
            {data.history.slice(0, 200).map((h) => {
              const d = describe(h, names);
              return (
                <div key={h.id} className="li">
                  <span className="tag" style={{ '--tagc': TAG_COLOR[d.tag] } as React.CSSProperties}>
                    {d.tag}
                  </span>
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
        <div className="note" style={{ borderTop: '2px dashed rgba(28,26,23,.15)', paddingTop: 12 }}>
          <b>冷卻期</b>（期內只係降低機率，唔係禁止；由接受結果嗰日起計）
          <br />
          {summaries.map((s) => (
            <span key={s}>
              {s}
              <br />
            </span>
          ))}
          記錯咗可以撳 × 刪走，冷卻期同家務分會即刻跟住改。
        </div>
      </Card>
      <Card label="片單" shadow={COLORS.yellow}>
        {data.watchlist.length === 0 ? (
          <span className="note">「今晚睇乜」出結果嗰陣可以將想睇嘅戲加落嚟。</span>
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
