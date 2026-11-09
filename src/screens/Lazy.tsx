import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { FlowBar } from '../components/Nav';
import { Pills } from '../components/ui';
import { useApp } from '../store/AppContext';

type Q = { k: 'q1' | 'q2' | 'q3'; title: string; opts: [string, string] };
const QS: Q[] = [
  { k: 'q1', title: '出街定留家？', opts: ['出街', '留家'] },
  { k: 'q2', title: '平價定正常？', opts: ['平價', '正常'] },
  { k: 'q3', title: '輕鬆定新鮮？', opts: ['輕鬆', '新鮮感'] },
];

export function plansFor(a: Record<Q['k'], string | undefined>): [string, string][] {
  const cheap = a.q2 === '平價';
  const fresh = a.q3 === '新鮮感';
  if (a.q1 === '留家') {
    return fresh
      ? [
          ['一齊煮一樣冇煮過嘅嘢', '揀個簡單食譜・食完一齊睇套冇睇過嘅戲'],
          ['叫外賣 ＋ 玩桌遊', cheap ? '叫平啲嘅・食完玩一鋪 15 分鐘嘅' : '想食乜叫乜・食完玩一鋪長嘅'],
        ]
      : [
          ['屋企煮 ＋ 睇返齣戲', '雪櫃有材料就煮，冇就叫外賣・唔使出門'],
          ['叫外賣 ＋ 煲劇', cheap ? '揀平啲嘅外賣・早啲瞓' : '想食乜叫乜・梳化見'],
        ];
  }
  return fresh
    ? [
        ['試間冇去過嘅餐廳 ＋ 買杯嘢飲慢慢行', '有少少新鮮感但唔攰・預兩個鐘'],
        ['搭車去另一區食飯散步', cheap ? '揀平價小店・行街當飯後運動' : '正常預算・行完先返屋企'],
      ]
    : [
        ['附近食晚飯 ＋ 散步一圈', (cheap ? '平價小店' : '正常預算') + '・行 30 分鐘內嘅路線'],
        ['樓下熟悉嗰間 ＋ 早啲返屋企', '唔使諗・食完返屋企抖'],
      ];
}

export function Lazy() {
  const { go, toast } = useApp();
  const [ans, setAns] = useState<Record<Q['k'], string | undefined>>({ q1: undefined, q2: undefined, q3: undefined });
  const [n, setN] = useState(0);
  const ready = !!(ans.q1 && ans.q2 && ans.q3);
  const plans = plansFor(ans);
  const plan = plans[n % plans.length]!;

  return (
    <>
      <FlowBar title="唔想諗" />
      <div className="narrow">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <h2 className="title" style={{ flex: 1 }}>
            答三條，我幫你揀
          </h2>
          <Mascot mood="sleepy" size={84} />
        </div>
        {QS.map((q) => (
          <div key={q.k}>
            <div className="section-title">{q.title}</div>
            <Pills options={q.opts} value={ans[q.k]} onChange={(v) => setAns((a) => ({ ...a, [q.k]: v }))} />
          </div>
        ))}
        {ready && (
          <div className="plan" style={{ background: 'var(--surface)' }}>
            <h3>{plan[0]}</h3>
            <span className="sub">{plan[1]}</span>
            <div className="row">
              <button type="button" className="btn2" onClick={() => setN(n + 1)}>
                換一個
              </button>
              <button
                type="button"
                className="btn2 accent"
                onClick={() => {
                  toast(`今日計劃：${plan[0]}`);
                  go('home');
                }}
              >
                就咁決定
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
