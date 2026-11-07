import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Btn, Card, COLORS } from '../components/ui';
import { RULES } from '../data/rules';
import { daysLabel } from '../engine/reasons';
import type { Person, Vote as VoteT, Votes } from '../engine/types';
import { daysBetween, lastPickedAt } from '../engine/weights';
import { useApp } from '../store/AppContext';

const BTNS: { v: VoteT; emoji: string; eat: string; other: string; color: string }[] = [
  { v: 'love', emoji: '❤️', eat: '特別想食', other: '特別想', color: COLORS.pink },
  { v: 'yes', emoji: '👍', eat: '想食', other: '想', color: COLORS.green },
  { v: 'ok', emoji: '😐', eat: '可以接受', other: '可以', color: COLORS.yellow },
  { v: 'no', emoji: '👎', eat: '今日唔想', other: '唔要', color: '#c9c2ae' },
];

export function Vote() {
  const { data, round, setRound, go, names } = useApp();
  const [voter, setVoter] = useState<Person>('A');
  const [handoff, setHandoff] = useState(false);
  const [mine, setMine] = useState<Votes>({ A: {}, B: {} });
  const cat = round.category;
  const options = data.options[cat];
  const now = Date.now();
  const hasConditions = RULES[cat].groups.length > 0;

  const setVote = (o: string, v: VoteT) =>
    setMine((m) => ({ ...m, [voter]: { ...m[voter], [o]: m[voter][o] === v ? undefined : v } }));

  const next = (votes: Votes | undefined) => {
    setRound((r) => ({ ...r, votes }));
    go(hasConditions ? 'cond' : 'wheel');
  };

  if (handoff) {
    return (
      <div className="narrow">
        <Card label="交換部機" shadow={COLORS.green}>
          <div className="handoff">
            <Mascot mood="please" size={110} />
            <h2 className="title">而家交畀 {names.B}</h2>
            <p className="sub" style={{ margin: 0 }}>
              {names.A} 嘅答案已經收埋咗，{names.B} 睇唔到。
            </p>
            <Btn
              onClick={() => {
                setHandoff(false);
                setVoter('B');
                window.scrollTo({ top: 0 });
              }}
            >
              我係 {names.B}，開始投 →
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  const voted = Object.values(mine[voter]).filter(Boolean).length;

  return (
    <div className="narrow">
      <Card label="第一步・兩個人各自秘密投票" right={`輪到：${names[voter]}`}>
        <h2 className="title">
          {names[voter]}，{cat === 'eat' ? '你今晚想食乜？' : '你想點？'}
        </h2>
        <p className="sub">
          另一半睇唔到你嘅答案。任何一方「{cat === 'eat' ? '今日唔想' : '唔要'}」嘅選項會直接出局；冇投嘅當「可以接受」。
        </p>
        {options.length === 0 && <div className="empty">呢個轉盤未有選項，去設定加返先。</div>}
        <div>
          {options.map((o) => {
            const last = lastPickedAt(data.history, cat, o);
            const cur = mine[voter][o];
            return (
              <div key={o} className="vote-row">
                <div className="vote-name">
                  <span>{o}</span>
                  {last !== null && <small>{daysLabel(cat, daysBetween(last, now))}</small>}
                </div>
                <div className="vote-btns" role="group" aria-label={`${o} 投票`}>
                  {BTNS.map((b) => (
                    <button
                      key={b.v}
                      type="button"
                      className="vbtn"
                      aria-pressed={cur === b.v}
                      style={{ '--c': b.color } as React.CSSProperties}
                      onClick={() => setVote(o, b.v)}
                    >
                      <b>{b.emoji}</b>
                      {cat === 'eat' ? b.eat : b.other}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {voter === 'A' ? (
          <Btn onClick={() => setHandoff(true)}>投好喇，交畀 {names.B} →</Btn>
        ) : (
          <Btn onClick={() => next(mine)}>兩個都投好，下一步 →</Btn>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="note">已投 {voted} / {options.length}</span>
          {voter === 'A' && (
            <button type="button" className="linkbtn" onClick={() => next(undefined)}>
              唔投票，直接轉
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
