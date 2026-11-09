import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { EarCard, type Perk } from '../components/EarCard';
import { Icon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { FlowBar } from '../components/Nav';
import { Btn } from '../components/ui';
import { CATEGORY_LABEL, RULES } from '../data/rules';
import { compromiseBoost, ledger } from '../engine/fairness';
import { daysLabel } from '../engine/reasons';
import { OptionEditor } from './Setup';
import type { Person, Vote as VoteT, Votes } from '../engine/types';
import { daysBetween, lastPickedAt } from '../engine/weights';
import { useApp } from '../store/AppContext';

const BTNS: { v: VoteT; eat: string; other: string; perk: Perk }[] = [
  { v: 'no', eat: '唔想食', other: '唔要', perk: 'flat' },
  { v: 'ok', eat: '可以', other: '可以', perk: 'neutral' },
  { v: 'yes', eat: '想食', other: '想', perk: 'up' },
  { v: 'love', eat: '好想食', other: '好想', perk: 'high' },
];
const perkOf = (v: VoteT | undefined): Perk => BTNS.find((b) => b.v === v)?.perk ?? 'low';

export function Vote() {
  const { data, round, setRound, go, names } = useApp();
  const [voter, setVoter] = useState<Person>('A');
  const [handoff, setHandoff] = useState(false);
  const [mine, setMine] = useState<Votes>({ A: {}, B: {} });
  const cat = round.category;
  const options = data.options[cat];
  const now = Date.now();
  const hasConditions = RULES[cat].groups.length > 0;
  const boost = compromiseBoost(ledger(data.history, now));
  const Q: Record<typeof cat, string> = { eat: '想食乜？', go: '想去邊？', watch: '想睇乜？', custom: '想點？' };
  const color = data.profiles[voter].color;

  const setVote = (o: string, v: VoteT) =>
    setMine((m) => ({ ...m, [voter]: { ...m[voter], [o]: m[voter][o] === v ? undefined : v } }));

  const next = (votes: Votes | undefined) => {
    setRound((r) => ({ ...r, votes }));
    go(hasConditions ? 'cond' : 'wheel');
  };

  if (handoff) {
    return (
      <>
        <FlowBar title={CATEGORY_LABEL[cat]} />
        <div className="handoff" style={{ minHeight: '70dvh', justifyContent: 'center' }}>
          <Mascot mood="please" size={170} />
          <h2 className="title">交俾 {names.B}</h2>
          <Avatar p="B" size={56} />
          <Btn
            onClick={() => {
              setHandoff(false);
              setVoter('B');
              window.scrollTo({ top: 0 });
            }}
          >
            我係 {names.B}
          </Btn>
        </div>
      </>
    );
  }

  return (
    <>
      <FlowBar
        title={CATEGORY_LABEL[cat]}
        right={
          <>
            <Avatar p={voter} size={26} />
            {names[voter]}
          </>
        }
      />
      <div className="narrow">
        <h2 className="title">
          {names[voter]}，{Q[cat]}
        </h2>
        {boost && voter === boost.who && <div className="boost-note">你最近遷就多咗，今次你嘅票會加成</div>}
        {cat === 'custom' && voter === 'A' && (
          <details className="quick-edit" open={options.every((o) => /^選項 [A-Z]$/.test(o))}>
            <summary>
              <Icon name="edit" size={18} />
              改選項
            </summary>
            <OptionEditor category="custom" bare />
          </details>
        )}
        {options.length === 0 && <div className="empty">未有選項</div>}
        <div className="vote-list">
          {options.map((o) => {
            const last = lastPickedAt(data.history, cat, o);
            const cur = mine[voter][o];
            return (
              <EarCard key={o} perk={perkOf(cur)} earColor={cur === 'love' ? color : undefined}>
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
                      style={{ '--c': color } as React.CSSProperties}
                      onClick={() => setVote(o, b.v)}
                    >
                      {cat === 'eat' ? b.eat : b.other}
                    </button>
                  ))}
                </div>
              </EarCard>
            );
          })}
        </div>
        {voter === 'A' ? (
          <Btn onClick={() => setHandoff(true)}>投好，交俾 {names.B}</Btn>
        ) : (
          <Btn onClick={() => next(mine)}>下一步</Btn>
        )}
        {voter === 'A' && (
          <button type="button" className="linkbtn" onClick={() => next(undefined)}>
            唔投票，直接轉
          </button>
        )}
      </div>
    </>
  );
}
