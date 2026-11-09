import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { EarCard } from '../components/EarCard';
import { Icon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { Duel } from '../games/Duel';
import { OBJECT_IMG } from '../data/objects';
import { useWeather } from '../services/hooks';
import { weeklyScores } from '../engine/chores';
import { pendingRating } from '../engine/fairness';
import { relDay } from '../engine/time';
import type { Category } from '../engine/types';
import { useApp } from '../store/AppContext';

const OPTIONS: { key: Category; name: string }[] = [
  { key: 'eat', name: '今晚食乜' },
  { key: 'go', name: '今日去邊' },
  { key: 'watch', name: '今晚睇乜' },
  { key: 'custom', name: '其他事' },
];

export function Home() {
  const { data, go, startRound, names, updateHistory, toast } = useApp();
  const [poke, setPoke] = useState(0);
  const [dueling, setDueling] = useState(false);
  const weather = useWeather();
  const now = Date.now();
  const scores = weeklyScores(data.history, now);
  const toRate = pendingRating(data.history, now);

  const open = (k: Category) => {
    startRound(k);
    // Every wheel starts with the secret vote (skippable) so the 遷就帳簿 can learn.
    go('vote');
  };

  return (
    <>
      <section className="studio">
        <div className="studio-top">今晚點揀</div>
        <h1>
          今晚，
          <br />
          邊個話事？
        </h1>
        {weather && (
          <div className="weather">
            <Icon name="sun" size={18} />
            <span className="num">{weather.tempC}°</span>
          </div>
        )}
        <div className="floor-shadow" />
        <button type="button" className="mascot-btn" onClick={() => setPoke((p) => p + 1)} aria-label="同吉祥物打招呼">
          <Mascot key={poke} mood={poke === 0 ? 'sideEye' : poke % 2 ? 'wave' : 'idle'} size={210} />
        </button>
      </section>

      <div className="sheet">
        <div className="scores" aria-label="本星期家務分">
          <span className="lbl">家務</span>
          {(['A', 'B'] as const).map((p) => (
            <span key={p} className="score">
              <Avatar p={p} size={30} />
              {names[p]}
              <b>{scores[p]}</b>
            </span>
          ))}
        </div>

        {toRate && (
          <div className="boost-note">
            <span style={{ flex: 1 }}>
              {relDay(toRate.ts, now)}嘅「{toRate.option}」好唔好？
            </span>
            <button
              type="button"
              className="btn2 sm"
              aria-label="唔好"
              onClick={() => updateHistory(toRate.id, (h) => ({ ...h, rating: 'down' }) as typeof h)}
            >
              <Icon name="down" size={18} />
            </button>
            <button
              type="button"
              className="btn2 sm accent"
              onClick={() => updateHistory(toRate.id, (h) => ({ ...h, rating: 'up' }) as typeof h)}
            >
              <Icon name="up" size={18} />好
            </button>
          </div>
        )}

        <div className="ear-grid">
          {OPTIONS.map((o) => (
            <EarCard key={o.key} as="button" onClick={() => open(o.key)}>
              {OBJECT_IMG[o.key] && <img className="opt-obj" src={OBJECT_IMG[o.key]} alt="" />}
              <span className="opt-name">{o.name}</span>
            </EarCard>
          ))}
        </div>

        <div className="actions">
          <button type="button" className="btn" onClick={() => go('lazy')}>
            <span>唔想諗，幫我揀</span>
          </button>
          <button type="button" className="btn2" style={{ minHeight: 56, borderRadius: 18, padding: '0 22px' }} onClick={() => setDueling(true)}>
            對決
          </button>
        </div>
      </div>

      {dueling && (
        <Duel
          stakes="贏家話事"
          onCancel={() => setDueling(false)}
          onDone={(w) => {
            setDueling(false);
            toast(`${names[w]} 贏咗，${names[w]} 話事`);
          }}
        />
      )}
    </>
  );
}
