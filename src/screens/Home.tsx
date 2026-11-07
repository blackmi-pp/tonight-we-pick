import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { COLORS, initial } from '../components/ui';
import { weeklyScores } from '../engine/chores';
import { relDay, weekdayLabel } from '../engine/time';
import type { Category } from '../engine/types';
import { useApp } from '../store/AppContext';

export function Header() {
  const { screen, go, data, names } = useApp();
  const now = Date.now();
  const scores = weeklyScores(data.history, now);
  const inSetup = screen === 'setup';
  return (
    <header className="narrow" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="header">
        <button type="button" className="logo" aria-label="返首頁" onClick={() => data.setupDone && go('home')}>
          <span>揀</span>
        </button>
        <div className="brand">
          <h1>今晚點揀？</h1>
          <p>兩個人決定所・{weekdayLabel(now)}</p>
        </div>
        {!inSetup && (
          <>
            <button type="button" className="hbtn" onClick={() => go('history')} aria-label="決定歷史">
              歷史
            </button>
            <button type="button" className="hbtn" onClick={() => go('setup')} aria-label="設定">
              ⚙︎
            </button>
          </>
        )}
      </div>
      {!inSetup && (
        <div className="scores" aria-label="本星期家務分數">
          <span className="score">
            <span className="avatar a">{initial(names.A)}</span>
            {scores.A} 分
          </span>
          <span className="score">
            <span className="avatar b">{initial(names.B)}</span>
            {scores.B} 分
          </span>
          <span className="note light" style={{ alignSelf: 'center' }}>
            本星期家務分
          </span>
        </div>
      )}
    </header>
  );
}

const TILES: {
  key: Category | 'tasks' | 'lazy';
  emoji: string;
  name: string;
  desc: string;
  tab: string;
  shadow: string;
  bg?: string;
}[] = [
  { key: 'eat', emoji: '🍜', name: '今晚食乜', desc: '秘密投票＋轉盤', tab: 'EAT', shadow: COLORS.pink },
  { key: 'go', emoji: '🗺️', name: '今日去邊', desc: '天氣、時間、交通', tab: 'GO', shadow: COLORS.yellow },
  { key: 'tasks', emoji: '⚖️', name: '邊個負責', desc: '家務公平引擎', tab: 'FAIR', shadow: COLORS.green },
  { key: 'watch', emoji: '📺', name: '今晚睇乜', desc: '電影、劇集、YouTube', tab: 'WATCH', shadow: COLORS.pink },
  { key: 'custom', emoji: '🎲', name: '自訂決定', desc: '臨時爭議快速建盤', tab: 'CUSTOM', shadow: COLORS.yellow, bg: COLORS.yellow },
  { key: 'lazy', emoji: '😴', name: '今日唔想揀', desc: '答三條，直接出建議', tab: 'LAZY', shadow: COLORS.yellow, bg: COLORS.pink },
];

export function Home() {
  const { data, go, startRound, names } = useApp();
  const [poke, setPoke] = useState(0);
  const now = Date.now();

  const open = (k: (typeof TILES)[number]['key']) => {
    if (k === 'tasks' || k === 'lazy') return go(k);
    startRound(k);
    // 食乜 and 自訂 start with a secret vote; 去邊 / 睇乜 start with conditions.
    go(k === 'eat' || k === 'custom' ? 'vote' : 'cond');
  };

  const lastPick = data.history.find((h) => h.kind === 'pick');
  const lastEat = data.history.find((h) => h.kind === 'pick' && h.category === 'eat');
  const lastChore = data.history.find((h) => h.kind === 'chore');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <button
          type="button"
          onClick={() => setPoke((p) => p + 1)}
          style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
          aria-label="同吉祥物打招呼"
        >
          <Mascot key={poke} mood={poke % 2 ? 'wave' : 'idle'} size={84} />
        </button>
        <div
          style={{
            position: 'relative',
            marginBottom: 30,
            background: COLORS.cream,
            border: `2.5px solid ${COLORS.ink}`,
            borderRadius: 14,
            padding: '8px 12px',
            fontWeight: 700,
            fontSize: 14,
            boxShadow: `3px 3px 0 ${COLORS.ink}`,
          }}
        >
          {names.A} 同 {names.B}，今晚揀咩先？
        </div>
      </div>

      <div className="home-grid">
        {TILES.map((t) => (
          <button
            key={t.key}
            type="button"
            className="card home-card"
            style={{ '--shadow': t.shadow } as React.CSSProperties}
            onClick={() => open(t.key)}
          >
            <div className="card-in" style={t.bg ? { background: t.bg, color: t.bg === COLORS.pink ? '#fff' : undefined } : undefined}>
              {!t.bg && (
                <div className="tab">
                  <span className="dot" style={{ background: COLORS.pink }} />
                  <span className="dot" style={{ background: COLORS.green }} />
                  <span className="label">{t.tab}</span>
                </div>
              )}
              <div className="emoji">{t.emoji}</div>
              <div>
                <div className="name">{t.name}</div>
                <div className="desc" style={t.bg === COLORS.pink ? { color: 'rgba(255,255,255,.8)' } : undefined}>
                  {t.desc}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="status">
        <div>
          {lastPick && lastPick.kind === 'pick'
            ? `上次決定：${lastPick.option}（${relDay(lastPick.ts, now)}）`
            : '仲未做過決定・撳上面卡片開始'}
        </div>
        <div>
          {lastEat && lastEat.kind === 'pick'
            ? `上次食：${lastEat.option}（${relDay(lastEat.ts, now)}）`
            : '仲未有食飯紀錄・由「今晚食乜」開始'}
        </div>
        <div>
          {lastChore && lastChore.kind === 'chore'
            ? `上次家務：${lastChore.chore} — ${names[lastChore.who]}（${relDay(lastChore.ts, now)}）`
            : '仲未分配過家務'}
        </div>
      </div>

      <p className="note light" style={{ textAlign: 'center', marginTop: 4 }}>
        吉祥物 by{' '}
        <a href="https://sipp.com.hk" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.yellow, fontWeight: 700 }}>
          sipp.
        </a>
      </p>
    </>
  );
}
