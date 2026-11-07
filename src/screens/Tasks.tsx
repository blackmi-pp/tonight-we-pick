import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Btn, Card, COLORS, Pills } from '../components/ui';
import {
  assignChore,
  lastDone,
  SKIP_CARDS_PER_MONTH,
  skipCardsLeft,
  weeklyScores,
  type Assignment,
  type ChoreSituation,
} from '../engine/chores';
import { relDay } from '../engine/time';
import type { Person } from '../engine/types';
import { useApp } from '../store/AppContext';

const other = (p: Person): Person => (p === 'A' ? 'B' : 'A');

interface Draw {
  chore: string;
  assignment: Assignment;
  who: Person | null;
  swapped: boolean;
  cardUsedBy: Person | null;
}

export function Tasks() {
  const { data, update, names, addHistory, go, toast } = useApp();
  const now = Date.now();
  const [picked, setChore] = useState<string | undefined>(data.chores[0]?.name);
  // A deleted chore can't stay selected.
  const chore = picked && data.chores.some((c) => c.name === picked) ? picked : data.chores[0]?.name;
  const [situation, setSituation] = useState<ChoreSituation>('none');
  const [draw, setDraw] = useState<Draw | null>(null);
  const [newName, setNewName] = useState('');
  const [newPts, setNewPts] = useState('');

  const scores = weeklyScores(data.history, now);
  const cards = skipCardsLeft(data.history, now);
  const pts = (name: string) => data.chores.find((c) => c.name === name)?.pts ?? 10;

  const addChore = () => {
    const name = newName.trim().slice(0, 16);
    if (!name) return;
    if (data.chores.some((c) => c.name === name)) return toast(`「${name}」已經有喇`);
    const p = Math.min(100, Math.max(1, parseInt(newPts, 10) || 10));
    update((d) => ({ ...d, chores: [...d.chores, { name, pts: p }] }));
    setNewName('');
    setNewPts('');
  };

  const doDraw = () => {
    if (!chore) return;
    const assignment = assignChore({ chore, history: data.history, now, situation });
    setDraw({ chore, assignment, who: assignment.who, swapped: false, cardUsedBy: null });
  };

  const accept = () => {
    if (!draw) return;
    if (!draw.who) {
      toast(`今晚${draw.chore}順延・兩個都好好休息`);
      setDraw(null);
      return go('home');
    }
    if (draw.cardUsedBy) addHistory({ kind: 'skipCard', who: draw.cardUsedBy, chore: draw.chore });
    const p = pts(draw.chore);
    addHistory({
      kind: 'chore',
      chore: draw.chore,
      who: draw.who,
      pts: p,
      via: draw.cardUsedBy ? 'skipCard' : draw.swapped ? 'swap' : draw.assignment.reason.kind === 'sick' ? 'sick' : 'draw',
    });
    toast(`今晚${draw.chore}：${names[draw.who]}・+${p} 分`);
    setDraw(null);
    go('home');
  };

  const reasonLines = (d: Draw): string[] => {
    const r = d.assignment.reason;
    const lines: string[] = [];
    switch (r.kind) {
      case 'postponed':
        lines.push('兩個都癱咗，今晚呢單順延，唔計分');
        break;
      case 'sick':
        lines.push(`${names[r.sick]} 今日 OT／唔舒服，直接交畀 ${names[other(r.sick)]}`);
        break;
      case 'fewerPoints':
        lines.push(`本星期 ${names.A} ${r.scores.A} 分、${names.B} ${r.scores.B} 分，分少嗰位做`);
        break;
      case 'didLessRecently':
        lines.push(`本星期兩個都係 ${r.scores.A} 分，打和`);
        lines.push(
          r.mineLast === null
            ? `${names[d.assignment.who!]} 紀錄入面仲未做過${d.chore}`
            : `${names[d.assignment.who!]} 上次做${d.chore}係${relDay(r.mineLast, now)}，比另一位耐`,
        );
        break;
      case 'coinFlip':
        lines.push(`本星期兩個都係 ${r.scores.A} 分，${d.chore}紀錄又一樣，所以擲公字`);
        break;
    }
    if (d.swapped && d.who) lines.push(`${names[other(d.who)]} 提出交換，${names[d.who]} 接手`);
    if (d.cardUsedBy) lines.push(`${names[d.cardUsedBy]} 用咗一張免做卡（接受先會扣）`);
    if (d.who) lines.push(`做完 ${names[d.who]} +${pts(d.chore)} 分`);
    return lines;
  };

  return (
    <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!draw ? (
        <Card label="FAIR・公平引擎" shadow={COLORS.green}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <h2 className="title">今晚邊個負責？</h2>
              <p className="sub" style={{ margin: '4px 0 0' }}>
                本星期分少嗰位做；打和就睇邊個耐啲冇做過呢樣。
              </p>
            </div>
            <Mascot mood="sideEye" size={70} />
          </div>
          <div>
            <div className="section-title">分配邊樣家務？</div>
            <Pills
              options={data.chores.map((c) => c.name)}
              value={chore}
              onChange={(v) => setChore(v)}
              labels={Object.fromEntries(data.chores.map((c) => [c.name, `${c.name}・${c.pts}`]))}
            />
          </div>
          <div>
            <div className="section-title">今日有冇特殊情況？</div>
            <Pills
              options={['none', 'A', 'B', 'both'] as const}
              value={situation}
              onChange={(v) => setSituation(v ?? 'none')}
              labels={{ none: '冇特別', A: `${names.A} OT／唔舒服`, B: `${names.B} OT／唔舒服`, both: '兩個都癱咗' }}
            />
          </div>
          {data.chores.length === 0 && <div className="note">家務表空咗，喺下面加返一樣先。</div>}
          <Btn onClick={doDraw} disabled={!chore}>
            裁決！
          </Btn>
        </Card>
      ) : (
        <>
          <Card label="本案裁決" shadow={COLORS.pink} bodyClass="">
            <div className="verdict">
              <Mascot mood={draw.who ? 'grumpy' : 'sleepy'} size={88} />
              <div className="kicker">今晚{draw.chore}</div>
              <div className="what">
                <span>{draw.who ? names[draw.who] : '順延一晚'}</span>
              </div>
            </div>
          </Card>
          <ul className="reasons">
            {reasonLines(draw).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <Btn onClick={accept}>{draw.who ? '接受任務' : '好，聽日先算'}</Btn>
          {draw.who && (
            <div className="row">
              <button
                type="button"
                className="btn2"
                disabled={draw.swapped || !!draw.cardUsedBy}
                onClick={() => setDraw({ ...draw, who: other(draw.who!), swapped: true })}
              >
                {draw.swapped ? '已交換' : '對方同意交換'}
              </button>
              <button
                type="button"
                className="btn2 danger"
                disabled={!!draw.cardUsedBy || draw.swapped || cards[draw.who] <= 0}
                onClick={() => setDraw({ ...draw, cardUsedBy: draw.who, who: other(draw.who!) })}
              >
                {draw.cardUsedBy ? '已用卡' : `${names[draw.who]} 用免做卡（剩 ${cards[draw.who]}）`}
              </button>
            </div>
          )}
          <button type="button" className="linkbtn" style={{ color: 'rgba(244,238,218,.8)' }} onClick={() => setDraw(null)}>
            ← 唔算，返轉頭
          </button>
        </>
      )}

      <Card label="家務分數表" shadow={COLORS.yellow}>
        <div className="list">
          {data.chores.map((c) => {
            const last = lastDone(data.history, c.name);
            return (
              <div key={c.name} className="li">
                <span className="grow">{c.name}</span>
                <span className="pts">{c.pts} 分</span>
                <span className="meta">{last ? `${names[last.who]}・${relDay(last.ts, now)}` : '未做過'}</span>
                <button
                  type="button"
                  className="x"
                  aria-label={`刪走 ${c.name}`}
                  onClick={() => update((d) => ({ ...d, chores: d.chores.filter((x) => x.name !== c.name) }))}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            addChore();
          }}
        >
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新家務（例：熨衫）" />
          <input
            className="input"
            style={{ flex: 'none', width: 64 }}
            inputMode="numeric"
            value={newPts}
            onChange={(e) => setNewPts(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            placeholder="分"
          />
          <button type="submit" className="btn2" style={{ flex: 'none' }}>
            ＋
          </button>
        </form>
        <p className="note" style={{ margin: 0 }}>
          本星期（星期一開始）：{names.A} {scores.A} 分・{names.B} {scores.B} 分。免做卡每人每月 {SKIP_CARDS_PER_MONTH} 張，今個月剩：
          {names.A} {cards.A}・{names.B} {cards.B}。
        </p>
      </Card>
    </div>
  );
}
