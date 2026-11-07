import { useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { Mascot } from '../components/Mascot';
import { Btn, Card, COLORS } from '../components/ui';
import {
  bestOf,
  HAND_LABEL,
  HANDS,
  rpsWinner,
  STOP_TARGET_MS,
  stopWinner,
  tapWinner,
  type Hand,
} from '../engine/games';
import type { Person } from '../engine/types';
import { useApp } from '../store/AppContext';

type Game = 'rps' | 'tap' | 'stop';

const GAMES: { key: Game; emoji: string; name: string; desc: string; color: string }[] = [
  { key: 'rps', emoji: '✊', name: '包剪揼', desc: '三局兩勝・輪流秘密出', color: COLORS.yellow },
  { key: 'tap', emoji: '👆', name: '撳快啲', desc: '8 秒內邊個撳得多', color: COLORS.pink },
  { key: 'stop', emoji: '⏱️', name: '停錶挑戰', desc: '盲停最接近 5.00 秒', color: COLORS.green },
];

const other = (p: Person): Person => (p === 'A' ? 'B' : 'A');

/* ───────── 包剪揼 ───────── */
function Rps({ onWin }: { onWin: (p: Person) => void }) {
  const { names } = useApp();
  const [rounds, setRounds] = useState<(Person | null)[]>([]);
  const [turn, setTurn] = useState<'A' | 'handoff' | 'B' | 'reveal'>('A');
  const [hands, setHands] = useState<{ A?: Hand; B?: Hand }>({});
  const [shake, setShake] = useState(0);

  const choose = (h: Hand) => {
    if (turn === 'A') {
      setHands({ A: h });
      setTurn('handoff');
    } else if (turn === 'B') {
      setHands((x) => ({ ...x, B: h }));
      setTurn('reveal');
      setShake(1);
    }
  };

  useEffect(() => {
    if (turn !== 'reveal' || shake === 0 || shake > 3) return;
    const t = setTimeout(() => setShake((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [turn, shake]);

  const revealed = turn === 'reveal' && shake > 3;
  const roundWinner = revealed && hands.A && hands.B ? rpsWinner(hands.A, hands.B) : undefined;
  const nextRounds = roundWinner !== undefined ? [...rounds, roundWinner] : rounds;
  const champion = bestOf(nextRounds);
  const score = (p: Person) => nextRounds.filter((r) => r === p).length;

  const next = () => {
    if (champion) return onWin(champion);
    setRounds(nextRounds);
    setHands({});
    setTurn('A');
    setShake(0);
  };

  return (
    <div className="game">
      <div className="scoreline">
        <span>
          {names.A} <b>{score('A')}</b>
        </span>
        <span className="note">三局兩勝</span>
        <span>
          <b>{score('B')}</b> {names.B}
        </span>
      </div>
      {(turn === 'A' || turn === 'B') && (
        <>
          <h3 className="game-title">{names[turn]}，秘密出拳</h3>
          <p className="note" style={{ textAlign: 'center', margin: 0 }}>
            {turn === 'A' ? `${names.B} 唔好望！` : `${names.A} 已經出咗，收埋咗喇`}
          </p>
          <div className="hands">
            {HANDS.map((h) => (
              <button key={h} type="button" className="hand" onClick={() => choose(h)}>
                <span>{HAND_LABEL[h].emoji}</span>
                {HAND_LABEL[h].name}
              </button>
            ))}
          </div>
        </>
      )}
      {turn === 'handoff' && (
        <div className="handoff">
          <Mascot mood="please" size={90} />
          <h3 className="game-title">交畀 {names.B}</h3>
          <Btn onClick={() => setTurn('B')}>我係 {names.B}，到我 →</Btn>
        </div>
      )}
      {turn === 'reveal' && (
        <div className="reveal">
          <div className="duo">
            {(['A', 'B'] as const).map((p) => (
              <div key={p} className={`fist ${revealed ? 'open' : 'shake'}`} style={{ animationDelay: `${shake * 0}ms` }}>
                <span>{revealed ? HAND_LABEL[hands[p]!].emoji : '✊'}</span>
                <small>{names[p]}</small>
              </div>
            ))}
          </div>
          <h3 className="game-title">
            {!revealed ? ['', '包！', '剪！', '揼！'][shake] : roundWinner === null ? '打和！再嚟' : `${names[roundWinner!]} 贏呢局`}
          </h3>
          {revealed && <Btn onClick={next}>{champion ? `${names[champion]} 勝出 →` : '下一局 →'}</Btn>}
        </div>
      )}
    </div>
  );
}

/* ───────── 撳快啲 ───────── */
const TAP_SECONDS = 8;
function TapRace({ onWin }: { onWin: (p: Person) => void }) {
  const { names } = useApp();
  const [phase, setPhase] = useState<'ready' | 'count' | 'go' | 'done'>('ready');
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(TAP_SECONDS);
  const [taps, setTaps] = useState({ A: 0, B: 0 });

  useEffect(() => {
    if (phase === 'count') {
      if (count === 0) {
        setPhase('go');
        return;
      }
      const t = setTimeout(() => setCount((c) => c - 1), 700);
      return () => clearTimeout(t);
    }
    if (phase === 'go') {
      if (left <= 0) {
        setPhase('done');
        return;
      }
      const t = setTimeout(() => setLeft((l) => +(l - 0.1).toFixed(1)), 100);
      return () => clearTimeout(t);
    }
  }, [phase, count, left]);

  const tap = (p: Person) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (phase === 'go') setTaps((t) => ({ ...t, [p]: t[p] + 1 }));
  };
  const winner = phase === 'done' ? tapWinner(taps.A, taps.B) : null;

  return (
    <div className="game">
      {phase === 'ready' && (
        <div className="handoff">
          <p className="note" style={{ margin: 0 }}>
            兩個人一齊拎住部手機，{names.A} 撳左邊，{names.B} 撳右邊。{TAP_SECONDS} 秒內撳得多嘅贏。
          </p>
          <Btn
            onClick={() => {
              setTaps({ A: 0, B: 0 });
              setLeft(TAP_SECONDS);
              setCount(3);
              setPhase('count');
            }}
          >
            準備好，開始！
          </Btn>
        </div>
      )}
      {(phase === 'count' || phase === 'go') && (
        <>
          <div className="tap-timer">{phase === 'count' ? count || '撳！' : left.toFixed(1)}</div>
          <div className="tap-zones">
            {(['A', 'B'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`tap-zone ${p.toLowerCase()}`}
                onPointerDown={tap(p)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <b>{taps[p]}</b>
                <small>{names[p]}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {phase === 'done' && (
        <div className="reveal">
          <h3 className="game-title">
            {names.A} {taps.A} 下 vs {names.B} {taps.B} 下
          </h3>
          {winner ? (
            <Btn onClick={() => onWin(winner)}>{names[winner]} 勝出 →</Btn>
          ) : (
            <Btn onClick={() => setPhase('ready')}>打和！再嚟</Btn>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── 停錶挑戰 ───────── */
const VISIBLE_MS = 1500;
function StopWatch({ onWin }: { onWin: (p: Person) => void }) {
  const { names } = useApp();
  const [who, setWho] = useState<Person>('A');
  const [phase, setPhase] = useState<'ready' | 'running' | 'handoff' | 'done'>('ready');
  const [times, setTimes] = useState<{ A?: number; B?: number }>({});
  const [now, setNow] = useState(0);
  const start = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (phase !== 'running') return;
    const loop = () => {
      setNow(performance.now() - start.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  const press = () => {
    if (phase === 'ready') {
      start.current = performance.now();
      setNow(0);
      setPhase('running');
      return;
    }
    if (phase === 'running') {
      const t = Math.round(performance.now() - start.current);
      cancelAnimationFrame(raf.current);
      const next = { ...times, [who]: t };
      setTimes(next);
      if (who === 'A') setPhase('handoff');
      else setPhase('done');
    }
  };

  const fmt = (ms: number) => (ms / 1000).toFixed(2);
  const winner = phase === 'done' && times.A !== undefined && times.B !== undefined ? stopWinner(times.A, times.B) : null;

  return (
    <div className="game">
      {(phase === 'ready' || phase === 'running') && (
        <>
          <h3 className="game-title">輪到 {names[who]}</h3>
          <p className="note" style={{ textAlign: 'center', margin: 0 }}>
            撳開始，心入面數到 {fmt(STOP_TARGET_MS)} 秒再撳停。頭 {VISIBLE_MS / 1000} 秒睇到時間，之後要靠感覺。
          </p>
          <div className="stopwatch">{phase === 'running' && now > VISIBLE_MS ? '?.??' : fmt(now)}</div>
          <Btn color={phase === 'running' ? 'yellow' : 'pink'} onClick={press}>
            {phase === 'running' ? '停！' : '開始'}
          </Btn>
        </>
      )}
      {phase === 'handoff' && (
        <div className="handoff">
          <Mascot mood="please" size={90} />
          <h3 className="game-title">{names.A} 停咗喇，交畀 {names.B}</h3>
          <p className="note" style={{ margin: 0 }}>
            {names.A} 嘅時間收埋咗，最後先揭曉。
          </p>
          <Btn
            onClick={() => {
              setWho('B');
              setPhase('ready');
            }}
          >
            我係 {names.B}，到我 →
          </Btn>
        </div>
      )}
      {phase === 'done' && (
        <div className="reveal">
          <div className="duo">
            {(['A', 'B'] as const).map((p) => (
              <div key={p} className="fist open">
                <span style={{ fontSize: 30 }}>{fmt(times[p]!)}</span>
                <small>
                  {names[p]}・差 {fmt(Math.abs(times[p]! - STOP_TARGET_MS))}
                </small>
              </div>
            ))}
          </div>
          {winner ? (
            <Btn onClick={() => onWin(winner)}>{names[winner]} 勝出 →</Btn>
          ) : (
            <Btn
              onClick={() => {
                setTimes({});
                setWho('A');
                setPhase('ready');
              }}
            >
              一模一樣！再嚟
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── shell ───────── */
export interface DuelProps {
  /** What the duel decides, e.g. "贏家話事：接受定重轉". */
  stakes: string;
  onDone: (winner: Person) => void;
  onCancel: () => void;
  /** Text for the winner's button, e.g. (name) => `${name} 話事`. */
  doneLabel?: (winner: Person) => string;
}

export function Duel({ stakes, onDone, onCancel, doneLabel }: DuelProps) {
  const { names } = useApp();
  const [game, setGame] = useState<Game | null>(null);
  const [winner, setWinner] = useState<Person | null>(null);

  useEffect(() => {
    const y = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      window.scrollTo({ top: y });
    };
  }, []);

  return (
    <div className="duel-overlay" role="dialog" aria-modal="true" aria-label="對決">
      <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="duel-head">
          <button type="button" className="hbtn" onClick={onCancel} aria-label="取消對決">
            ✕
          </button>
          <div>
            <div className="duel-title">⚔️ 對決</div>
            <div className="note light">{stakes}</div>
          </div>
        </div>

        {winner ? (
          <Card label="對決結果" shadow={COLORS.green} bodyClass="">
            <Confetti />
            <div className="verdict">
              <Mascot mood="jump" once size={92} />
              <div className="kicker">勝出者</div>
              <div className="what">
                <span>{names[winner]}</span>
              </div>
              <p className="note">{names[other(winner)]} 願賭服輸 🙏</p>
            </div>
            <div style={{ padding: '0 16px 18px' }}>
              <Btn onClick={() => onDone(winner)}>{doneLabel ? doneLabel(winner) : '好，照做'}</Btn>
            </div>
          </Card>
        ) : !game ? (
          <Card label="揀個遊戲" shadow={COLORS.yellow}>
            <div className="game-list">
              {GAMES.map((g) => (
                <button key={g.key} type="button" className="game-pick" style={{ background: g.color }} onClick={() => setGame(g.key)}>
                  <span className="emoji">{g.emoji}</span>
                  <span>
                    <b>{g.name}</b>
                    <small>{g.desc}</small>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Mascot mood="grumpy" size={80} />
            </div>
          </Card>
        ) : (
          <Card label={GAMES.find((g) => g.key === game)!.name} shadow={COLORS.pink}>
            {game === 'rps' && <Rps onWin={setWinner} />}
            {game === 'tap' && <TapRace onWin={setWinner} />}
            {game === 'stop' && <StopWatch onWin={setWinner} />}
            <button type="button" className="linkbtn" onClick={() => setGame(null)}>
              ← 換第二個遊戲
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
