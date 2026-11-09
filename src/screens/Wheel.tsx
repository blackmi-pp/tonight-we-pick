import { useEffect, useMemo, useRef, useState } from 'react';
import { Mascot } from '../components/Mascot';
import { FlowBar } from '../components/Nav';
import { Card, COLORS } from '../components/ui';
import { CATEGORY_LABEL, rulesWithTags } from '../data/rules';
import { compromiseBoost, ledger } from '../engine/fairness';
import { pct } from '../engine/reasons';
import { computeWeights, drawIndex, eligible, type OptionWeight } from '../engine/weights';
import { arcPath, slicesFor, targetRotation } from '../engine/wheel';
import { useApp } from '../store/AppContext';

export const SPIN_SECONDS = 4.2;
// Toy-paint tones: distinct enough to tell slices apart, all at the same quiet saturation.
const SEG_COLORS = ['#e9b44c', '#8fb8d8', '#e8957b', '#a9c98a', '#c5b3e6', '#f0d9a8', '#7fa9a5', '#e7b7c8', '#b8c4cc', '#d9c27a', '#9cb0e0', '#d6a58c'];
export const segColor = (i: number) => SEG_COLORS[i % SEG_COLORS.length]!;

/** Long names would run into the hub; the full name is always in the odds list. */
export const label = (o: string) => ([...o].length > 6 ? [...o].slice(0, 5).join('') + '…' : o);

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(x < 1 ? 2 : 1));

function why(r: OptionWeight, names: Record<'A' | 'B', string>): string {
  if (r.vetoedBy.length) return `被 ${r.vetoedBy.map((p) => names[p]).join('、')} 否決`;
  const parts: string[] = [];
  if (r.voteFactor !== 1) parts.push(`投票 ×${fmt(r.voteFactor)}`);
  if (r.conditionFactor !== 1) parts.push(`條件 ×${fmt(r.conditionFactor)}`);
  if (r.cooldownFactor < 1) parts.push(`冷卻中 ×${fmt(r.cooldownFactor)}`);
  if (r.cooldownFactor > 1) parts.push(`${r.daysSinceLast} 日冇揀 ×${fmt(r.cooldownFactor)}`);
  if (r.ratingFactor !== 1) parts.push(`評分 ×${fmt(r.ratingFactor)}`);
  if (r.boosted) parts.push(`含${names[r.boosted.who]}遷就加成`);
  return parts.length ? parts.join('・') : '冇加減';
}

export function useRoundWeights() {
  const { data, round } = useApp();
  // Freeze "now" for the round so the odds don't shift while you look at them.
  const now = useRef(Date.now()).current;
  return useMemo(
    () =>
      computeWeights({
        category: round.category,
        options: data.options[round.category],
        votes: round.votes,
        conditions: round.conditions,
        history: data.history,
        rules: rulesWithTags(round.category, data.tags),
        now,
        exclude: round.exclude,
        boost: round.votes ? compromiseBoost(ledger(data.history, now)) : null,
      }),
    [data.options, data.history, data.tags, round.category, round.votes, round.conditions, round.exclude, now],
  );
}

export function Wheel() {
  const { data, round, setRound, go, names } = useApp();
  const rows = useRoundWeights();
  const live = eligible(rows);
  const slices = slicesFor(live.map((r) => r.probability));
  const colorOf = (o: string) => segColor(data.options[round.category].indexOf(o));

  const [rotation, setRotation] = useState(round.rotation);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const spin = () => {
    if (spinning || live.length === 0) return;
    const idx = drawIndex(live);
    if (idx < 0) return;
    const winner = live[idx]!.option;
    const target = targetRotation(rotation, slices[idx]!);
    setSpinning(true);
    setRotation(target);
    timer.current = window.setTimeout(() => {
      try {
        navigator.vibrate?.(60);
      } catch {
        /* not supported */
      }
      setRound((r) => ({ ...r, winner, rotation: target }));
      go('result');
    }, SPIN_SECONDS * 1000 + 300);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // A reroll comes straight back here and spins automatically.
  useEffect(() => {
    if (round.rerolled && !round.winner) {
      const t = window.setTimeout(spin, 350);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...rows].sort((a, b) => b.probability - a.probability);

  return (
    <>
      <FlowBar title={CATEGORY_LABEL[round.category]} />
      <div className="narrow">
        <div className="wheel-wrap">
          <div className="wheel-ears" aria-hidden="true">
            <svg className="l" viewBox="0 0 40 40">
              <path d="M3 38C4 25 9 11 17 3.5c1.7-1.6 4-1.4 5.3.5C28 12 34 25 36 38z" />
            </svg>
            <svg className="r" viewBox="0 0 40 40">
              <path d="M3 38C4 25 9 11 17 3.5c1.7-1.6 4-1.4 5.3.5C28 12 34 25 36 38z" />
            </svg>
          </div>
          <div
            className="wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_SECONDS}s cubic-bezier(.15,.9,.18,1)` : 'none',
            }}
          >
            <svg viewBox="0 0 200 200" aria-label="轉盤">
              <circle cx="100" cy="100" r="100" fill={COLORS.ink} />
              {live.map((r, i) => {
                const s = slices[i]!;
                const mid = (s.start + s.end) / 2;
                const width = s.end - s.start;
                const flip = mid > 180;
                const fontSize = Math.min(13, Math.max(9, 62 / Math.max(2, label(r.option).length)));
                return (
                  <g key={r.option}>
                    <path d={arcPath(100, 100, 95, s)} fill={colorOf(r.option)} stroke={COLORS.paper} strokeWidth="1.2" strokeLinejoin="round" />
                    {width >= 9 && (
                      <text
                        transform={`rotate(${mid - 90} 100 100) translate(${100 + 58} 100) rotate(${flip ? 180 : 0})`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="'Noto Sans TC', 'PingFang HK', sans-serif"
                        fontWeight={700}
                        fontSize={fontSize}
                        fill={COLORS.ink}
                      >
                        {label(r.option)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <svg className="pointer" viewBox="0 0 26 32" aria-hidden="true">
            <path d="M3 3 H23 L13 29 Z" fill={COLORS.ink} stroke={COLORS.paper} strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <button type="button" className="hub" onClick={spin} disabled={spinning || live.length === 0}>
            {spinning ? '…' : live.length ? '轉' : '冇得轉'}
          </button>
        </div>
        <div className="wheel-caption">
          <Mascot mood={spinning ? 'lookUp' : live.length ? 'idle' : 'grumpy'} size={64} />
          {!live.length && <span>全部選項都出咗局</span>}
        </div>

        <Card label="機率">
          <div className="odds">
            {sorted.map((r) => (
              <div key={r.option} className={`odd ${r.weight > 0 ? '' : 'out'}`}>
                <span className="swatch" style={{ background: colorOf(r.option) }} />
                <span className="n">{r.option}</span>
                <span className="p">{pct(r.probability)}</span>
                <span className="bar">
                  <i style={{ width: `${r.probability * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
          <details className="explain">
            <summary>點計？</summary>
            <ul className="reasons" style={{ marginTop: 12 }}>
              {sorted.map((r) => (
                <li key={r.option}>
                  {r.option}：{why(r, names)}
                </li>
              ))}
            </ul>
            <p className="note">兩人投票分數相乘，再乘條件、冷卻期同評分，按比例變成機率。最近遷就多咗嗰位，佢嘅票會加成。</p>
          </details>
        </Card>
      </div>
    </>
  );
}
