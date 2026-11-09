import { useEffect, useRef } from 'react';
import { Mascot } from '../components/Mascot';
import { FlowBar } from '../components/Nav';
import { useWeather } from '../services/hooks';
import { Btn, Pills } from '../components/ui';
import { CATEGORY_LABEL, RULES } from '../data/rules';
import { useApp } from '../store/AppContext';

export function Conditions() {
  const { round, setRound, go } = useApp();
  const rules = RULES[round.category];
  const answered = Object.values(round.conditions).filter(Boolean).length;
  const weather = useWeather();
  const filled = useRef(false);

  // 今日去邊: pre-fill 今日天氣 from the Observatory once; the couple can still change it.
  useEffect(() => {
    if (round.category !== 'go' || !weather || filled.current || round.conditions['今日天氣']) return;
    filled.current = true;
    setRound((r) => ({ ...r, conditions: { ...r.conditions, 今日天氣: weather.answer } }));
  }, [weather, round.category, round.conditions, setRound]);

  return (
    <>
      <FlowBar title={CATEGORY_LABEL[round.category]} />
      <div className="narrow">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <h2 className="title" style={{ flex: 1 }}>
            {rules.condTitle}
          </h2>
          <Mascot mood="think" size={84} />
        </div>
        {rules.groups.map((g) => (
          <div key={g.title}>
            <div className="section-title">
              {g.title}
              {g.title === '今日天氣' && weather && <span style={{ color: 'var(--mute)', marginLeft: 8 }}>{weather.tempC}°</span>}
            </div>
            <Pills
              options={Object.keys(g.answers)}
              value={round.conditions[g.title]}
              onChange={(v) => setRound((r) => ({ ...r, conditions: { ...r.conditions, [g.title]: v } }))}
            />
          </div>
        ))}
        <Btn onClick={() => go('wheel')}>{answered ? '去轉盤' : '唔理條件，去轉盤'}</Btn>
      </div>
    </>
  );
}
