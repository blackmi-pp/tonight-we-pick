import { useState } from 'react';
import { Confetti } from '../components/Confetti';
import { FilmSuggest } from '../components/FilmSuggest';
import { Mascot } from '../components/Mascot';
import { Nearby } from '../components/Nearby';
import { Duel } from '../games/Duel';
import { EarCard } from '../components/EarCard';
import { Icon } from '../components/icons';
import { FlowBar } from '../components/Nav';
import { Btn, Card } from '../components/ui';
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
  const [dueling, setDueling] = useState(false);
  const cat = round.category;
  const winner = rows.find((r) => r.option === round.winner);

  if (!winner) {
    return (
      <div className="narrow" style={{ paddingTop: 48 }}>
        <div className="empty">呢輪已經完咗</div>
        <Btn onClick={() => go('home')}>返首頁</Btn>
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
    setRound((r) => ({ ...r, exclude: [...r.exclude, winner.option], rerolled: true, winner: undefined, duelWinner: undefined }));
    go('wheel');
  };
  const othersLeft = rows.filter((r) => r.weight > 0 && r.option !== winner.option).length;

  const isHome = tagsFor('eat', winner.option, data.tags).includes('home');
  const showNearby = (cat === 'eat' && !isHome) || cat === 'go';
  const filmKind = cat === 'watch' ? ({ 電影: 'movie', 紀錄片: 'movie', 劇集: 'tv' } as const)[winner.option as '電影'] : undefined;
  const mood = winner.option === '紀錄片' ? '長知識' : round.conditions['想要咩感覺'];
  const time = round.conditions['淨返幾多時間'];
  const maxMinutes = time === '30 分鐘' ? 40 : time === '1–2 個鐘' ? 125 : undefined;
  const alt =
    cat === 'watch'
      ? { label: '自己輸入片名', run: () => setAdding((a) => !a) }
      : cat === 'custom'
        ? { label: '編輯選項', run: () => go('setup') }
        : null;
  const canReroll = !round.rerolled && othersLeft > 0;
  const saveTitle = (name: string) => {
    update((d) => ({ ...d, watchlist: d.watchlist.includes(name) ? d.watchlist : [...d.watchlist, name] }));
    toast(`已加入片單：${name}`);
  };

  const saveWatch = () => {
    const name = title.trim().slice(0, 40);
    if (!name) return;
    update((d) => ({ ...d, watchlist: d.watchlist.includes(name) ? d.watchlist : [...d.watchlist, name] }));
    setTitle('');
    toast(`已加入片單：${name}`);
  };

  return (
    <>
    <FlowBar title={CATEGORY_LABEL[cat]} />
    <div className="narrow">
      <EarCard perk="high">
        <Confetti key={winner.option} />
        <div className="verdict">
          <Mascot mood="jump" once size={120} className="" />
          <div className="kicker">{PREFIX[cat]}</div>
          <div className="what">{winner.option}</div>
        </div>
      </EarCard>

      <Card label="點解係佢">
        <ul className="reasons">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      {round.duelWinner && <div className="boost-note">{names[round.duelWinner]} 贏咗對決，接受定重轉由佢決定</div>}

      <Btn onClick={accept}>就咁話</Btn>
      <div className="row">
        <button type="button" className="btn2" onClick={reroll} disabled={!canReroll}>
          {round.rerolled ? '重轉用晒' : round.duelWinner ? '贏家重轉' : '重轉一次'}
        </button>
        {!round.duelWinner ? (
          <button type="button" className="btn2" onClick={() => setDueling(true)} disabled={round.dueled || othersLeft === 0}>
            <Icon name="swords" size={18} />
            {round.dueled ? '對決過喇' : '唔服，對決'}
          </button>
        ) : (
          alt && (
            <button type="button" className="btn2" onClick={alt.run}>
              {alt.label}
            </button>
          )
        )}
      </div>
      {!round.duelWinner && alt && (
        <button type="button" className="linkbtn" onClick={alt.run}>
          {alt.label}
        </button>
      )}

      {showNearby && <Nearby option={winner.option} verb={cat === 'eat' ? '食' : '去'} />}
      {filmKind && (
        <FilmSuggest kind={filmKind} mood={mood} maxMinutes={maxMinutes} onSave={saveTitle} saved={data.watchlist} />
      )}

      {adding && (
        <Card label="加入片單">
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


      {dueling && (
        <Duel
          stakes={`爭「${winner.option}」：贏家決定接受定重轉`}
          doneLabel={(w) => `${names[w]} 話事`}
          onCancel={() => setDueling(false)}
          onDone={(w) => {
            setRound((r) => ({ ...r, duelWinner: w, dueled: true, rerolled: false }));
            setDueling(false);
          }}
        />
      )}
    </div>
    </>
  );
}
