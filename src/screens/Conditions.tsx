import { Mascot } from '../components/Mascot';
import { Btn, Card, Pills } from '../components/ui';
import { RULES } from '../data/rules';
import { useApp } from '../store/AppContext';

export function Conditions() {
  const { round, setRound, go } = useApp();
  const rules = RULES[round.category];
  const answered = Object.values(round.conditions).filter(Boolean).length;

  return (
    <div className="narrow">
      <Card label={round.votes ? '第二步・加入現實條件' : '加入現實條件'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h2 className="title">{rules.condTitle}</h2>
            <p className="sub" style={{ margin: '4px 0 0' }}>
              {rules.condSub}。唔答嘅就唔計。
            </p>
          </div>
          <Mascot mood="think" size={70} />
        </div>
        {rules.groups.map((g) => (
          <div key={g.title}>
            <div className="section-title">{g.title}</div>
            <Pills
              options={Object.keys(g.answers)}
              value={round.conditions[g.title]}
              onChange={(v) => setRound((r) => ({ ...r, conditions: { ...r.conditions, [g.title]: v } }))}
            />
          </div>
        ))}
        <Btn onClick={() => go('wheel')}>{answered ? '去轉盤 →' : '唔理條件，去轉盤 →'}</Btn>
      </Card>
    </div>
  );
}
