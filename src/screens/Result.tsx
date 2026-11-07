import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Btn, Card, COLORS } from '../components/ui';
import { CATEGORY_LABEL, tagsFor } from '../data/rules';
import { buildReasons } from '../engine/reasons';
import { useApp } from '../store/AppContext';
import { useRoundWeights } from './Wheel';

const PREFIX = { eat: '今晚食', go: '今日去', watch: '今晚睇', custom: '結果' } as const;

export function openMaps(query: string) {
  const q = encodeURIComponent(query);
  const apple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  window.open(
    apple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`,
    '_blank',
    'noopener',
  );
}

export function Result() {
  const { round, setRound, go, addHistory, removeHistory, names, toast, data, update } = useApp();
  const rows = useRoundWeights();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const cat = round.category;
  const winner = rows.find((r) => r.option === round.winner);

  if (!winner) {
    return (
      <div className="narrow">
        <Card label="結果">
          <div className="empty">呢輪已經完咗。</div>
          <Btn onClick={() => go('home')}>返首頁</Btn>
        </Card>
      </div>
    );
  }

  const reasons = buildReasons({ category: cat, winner, rows, votes: round.votes, names });

  const accept = () => {
    const v = round.votes;
    const votes = v
      ? { ...(v.A[winner.option] ? { A: v.A[winner.option] } : {}), ...(v.B[winner.option] ? { B: v.B[winner.option] } : {}) }
      : undefined;
    const id = addHistory({ kind: 'pick', category: cat, option: winner.option, ...(votes ? { votes } : {}) });
    setRound((r) => ({ ...r, winner: undefined }));
    toast(`記低咗：${winner.option}`, { label: '撤回', run: () => removeHistory(id) });
    go('home');
  };

  const reroll = () => {
    setRound((r) => ({ ...r, exclude: [...r.exclude, winner.option], rerolled: true, winner: undefined }));
    go('wheel');
  };
  const othersLeft = rows.filter((r) => r.weight > 0 && r.option !== winner.option).length;

  const isHome = tagsFor('eat', winner.option, data.tags).includes('home');
  const alt =
    cat === 'eat'
      ? isHome
        ? null
        : { label: '搵附近餐廳', run: () => openMaps(`${winner.option} 餐廳`) }
      : cat === 'go'
        ? { label: '開地圖', run: () => openMaps(winner.option) }
        : cat === 'watch'
          ? { label: '加入片單', run: () => setAdding((a) => !a) }
          : { label: '編輯選項', run: () => go('setup') };

  const saveWatch = () => {
    const name = title.trim().slice(0, 40);
    if (!name) return;
    update((d) => ({ ...d, watchlist: d.watchlist.includes(name) ? d.watchlist : [...d.watchlist, name] }));
    setTitle('');
    toast(`已加入片單：${name}`);
  };

  return (
    <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card label={`結果・${CATEGORY_LABEL[cat]}`} shadow={COLORS.green} bodyClass="">
        <div className="verdict">
          <Mascot mood="jump" once size={92} className="" />
          <div className="kicker">轉盤裁決</div>
          <div className="what">
            {PREFIX[cat]}
            <span>{winner.option}</span>
          </div>
        </div>
      </Card>

      <ul className="reasons" aria-label="點解係佢">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <Btn onClick={accept}>接受結果</Btn>
      <div className="row">
        <button type="button" className="btn2" onClick={reroll} disabled={round.rerolled || othersLeft === 0}>
          {round.rerolled ? '重轉用晒' : '最後一次重轉'}
        </button>
        {alt && (
          <button type="button" className="btn2" onClick={alt.run}>
            {alt.label}
          </button>
        )}
      </div>

      {adding && (
        <Card label="加入片單" shadow={COLORS.yellow}>
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              saveWatch();
            }}
          >
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="戲名／劇名" />
            <button type="submit" className="btn2" style={{ flex: 'none' }}>
              存入
            </button>
          </form>
          {data.watchlist.length > 0 && (
            <div className="pills">
              {data.watchlist.map((w) => (
                <span key={w} className="chip">
                  {w}
                  <button
                    type="button"
                    aria-label={`刪走 ${w}`}
                    onClick={() => update((d) => ({ ...d, watchlist: d.watchlist.filter((x) => x !== w) }))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="note light" style={{ margin: 0, textAlign: 'center' }}>
        每輪得一次重轉，重轉會將今次結果移出呢一輪。接受咗先會記入歷史同計冷卻期。
      </p>
    </div>
  );
}
