import { useEffect, useMemo, useRef, useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Card, COLORS } from '../components/ui';
import { CATEGORY_LABEL, RULES } from '../data/rules';
import { pct } from '../engine/reasons';
import { computeWeights, drawIndex, eligible, type OptionWeight } from '../engine/weights';
import { arcPath, slicesFor, targetRotation } from '../engine/wheel';
import { useApp } from '../store/AppContext';

export const SPIN_SECONDS = 4.2;
const SEG_COLORS = ['#f2467f', '#ffd23f', '#a8d84b', '#f4eeda', '#7fc8bd', '#f2865e', '#c78bde', '#5e9df2', '#e0b64a', '#8fd8a0', '#f2a8c0', '#d8cf4b'];
export const segColor = (i: number) => SEG_COLORS[i % SEG_COLORS.length]!;

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(x < 1 ? 2 : 1));

function why(r: OptionWeight, names: Record<'A' | 'B', string>): string {
  if (r.vetoedBy.length) return `被 ${r.vetoedBy.map((p) => names[p]).join('、')} 否決`;
  const parts: string[] = [];
  if (r.voteFactor !== 1) parts.push(`投票 ×${fmt(r.voteFactor)}`);
  if (r.conditionFactor !== 1) parts.push(`條件 ×${fmt(r.conditionFactor)}`);
  if (r.cooldownFactor < 1) parts.push(`冷卻中 ×${fmt(r.cooldownFactor)}`);
  if (r.cooldownFactor > 1) parts.push(`${r.daysSinceLast} 日冇揀 ×${fmt(r.cooldownFactor)}`);
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
        rules: RULES[round.category],
        now,
        exclude: round.exclude,
      }),
    [data.options, data.history, round.category, round.votes, round.conditions, round.exclude, now],
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
    <div className="wheel-layout">
      <div>
        <div className="wheel-wrap">
          <div className="wheel-shadow" />
          <div
            className="wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_SECONDS}s cubic-bezier(.15,.9,.18,1)` : 'none',
            }}
          >
            <svg viewBox="0 0 200 200" aria-label="轉盤">
              <circle cx="100" cy="100" r="98" fill="#d9d2be" stroke={COLORS.ink} strokeWidth="3" />
              {live.map((r, i) => {
                const s = slices[i]!;
                const mid = (s.start + s.end) / 2;
                const width = s.end - s.start;
                const flip = mid > 180;
                const fontSize = Math.min(13, Math.max(8, 70 / Math.max(2, r.option.length)));
                return (
                  <g key={r.option}>
                    <path d={arcPath(100, 100, 96.5, s)} fill={colorOf(r.option)} stroke={COLORS.ink} strokeWidth="2" strokeLinejoin="round" />
                    {width >= 9 && (
                      <text
                        transform={`rotate(${mid - 90} 100 100) translate(${100 + 60} 100) rotate(${flip ? 180 : 0})`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="'Mantou Sans','LXGW WenKai TC','Noto Sans TC',sans-serif"
                        fontWeight={700}
                        fontSize={fontSize}
                        fill={COLORS.ink}
                      >
                        {r.option}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <svg className="pointer" viewBox="0 0 34 42" aria-hidden="true">
            <path d="M3 3 H31 L17 39 Z" fill={COLORS.pink} stroke={COLORS.ink} strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <button type="button" className="hub" onClick={spin} disabled={spinning || live.length === 0}>
            {spinning ? '……' : live.length ? '開轉' : '冇選項'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Mascot mood={spinning ? 'lookUp' : live.length ? 'idle' : 'grumpy'} size={60} />
          <p className="wheel-caption" style={{ margin: 0, textAlign: 'left' }}>
            {spinning
              ? '轉盤決定緊你哋嘅命運……'
              : live.length
                ? '每格大小就係真實中獎機率。撳中間開轉。'
                : '全部選項都被否決或者刪走咗，返去改投票或者喺設定加選項。'}
          </p>
        </div>
      </div>

      <Card label={`${CATEGORY_LABEL[round.category]}・中獎機率`} shadow={COLORS.yellow}>
        <div className="odds">
          {sorted.map((r) => (
            <div key={r.option} className={`odd ${r.weight > 0 ? '' : 'out'}`}>
              <span className="swatch" style={{ background: colorOf(r.option) }} />
              <span className="n">{r.option}</span>
              <span className="p">{pct(r.probability)}</span>
              <span className="bar">
                <i style={{ width: `${r.probability * 100}%` }} />
              </span>
              <span className="why">{why(r, names)}</span>
            </div>
          ))}
        </div>
        <p className="note" style={{ margin: 0 }}>
          點計：權重 = 投票（兩人分數相乘：❤️3・👍2・😐1・👎出局）× 條件 × 冷卻期，再按比例變成機率。啱啱揀過嘅會打折，隔耐冇揀嘅有加成。
        </p>
      </Card>
    </div>
  );
}
