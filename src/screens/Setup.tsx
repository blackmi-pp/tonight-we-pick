import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Btn, Card, initial } from '../components/ui';
import { CATEGORY_LABEL } from '../data/rules';
import type { Category } from '../engine/types';
import { useApp } from '../store/AppContext';

const CATS: Category[] = ['eat', 'go', 'watch', 'custom'];
export const MAX_OPTIONS = 12;
export const MAX_LEN = 16;

export function OptionEditor({ category }: { category: Category }) {
  const { data, update, toast } = useApp();
  const [draft, setDraft] = useState('');
  const list = data.options[category];

  const add = () => {
    const v = draft.trim().slice(0, MAX_LEN);
    setDraft('');
    if (!v) return;
    if (list.includes(v)) return toast(`「${v}」已經有喇`);
    if (list.length >= MAX_OPTIONS) return toast(`每個轉盤最多 ${MAX_OPTIONS} 個選項`);
    update((d) => ({ ...d, options: { ...d.options, [category]: [...d.options[category], v] } }));
  };
  const remove = (o: string) =>
    update((d) => ({ ...d, options: { ...d.options, [category]: d.options[category].filter((x) => x !== o) } }));

  return (
    <div>
      <div className="section-title">{CATEGORY_LABEL[category]}</div>
      <div className="pills" style={{ marginBottom: 8 }}>
        {list.map((o) => (
          <span key={o} className="chip">
            {o}
            <button type="button" aria-label={`刪走 ${o}`} onClick={() => remove(o)}>
              ×
            </button>
          </span>
        ))}
        {list.length === 0 && <span className="note">仲未有選項</span>}
      </div>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          className="input"
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="新選項"
          enterKeyHint="done"
        />
        <button type="submit" className="btn2" style={{ flex: 'none' }}>
          ＋ 加
        </button>
      </form>
    </div>
  );
}

export function Setup() {
  const { data, update, go, resetAll } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [armed, setArmed] = useState(false);
  const first = !data.setupDone;

  const setName = (p: 'A' | 'B', v: string) => update((d) => ({ ...d, users: { ...d.users, [p]: v.slice(0, 12) } }));
  const finish = () => {
    update((d) => ({ ...d, setupDone: true }));
    go('home');
  };

  return (
    <div className="narrow">
      <Card label={first ? `首次設定・STEP ${step} / 2` : `設定・${step === 1 ? '名字' : '選項'}`}>
        {step === 1 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mascot mood="wave" size={72} />
              <div>
                <h2 className="title">邊兩位一齊用？</h2>
                <p className="sub" style={{ margin: 0 }}>
                  名可以隨時改。所有資料只會存喺呢部機。
                </p>
              </div>
            </div>
            {(['A', 'B'] as const).map((p, i) => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`avatar ${p.toLowerCase()}`} style={{ width: 40, height: 40, fontSize: 14 }}>
                  {initial(data.users[p])}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="note">{i === 0 ? '第一位' : '第二位'}</span>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={data.users[p]}
                    onChange={(e) => setName(p, e.target.value)}
                    placeholder="輸入名字"
                    autoComplete="off"
                  />
                </span>
              </label>
            ))}
            <Btn onClick={() => setStep(2)} disabled={!data.users.A.trim() || !data.users.B.trim()}>
              下一步：設定選項 →
            </Btn>
          </>
        ) : (
          <>
            <h2 className="title">每個轉盤有咩選擇？</h2>
            <p className="sub">撳 × 刪走・打字加新選項。自己加嘅選項唔會受條件影響，只受投票同冷卻期影響。</p>
            {CATS.map((c) => (
              <OptionEditor key={c} category={c} />
            ))}
            <div className="row">
              <button type="button" className="btn2" style={{ flex: 'none' }} onClick={() => setStep(1)}>
                ← 上一步
              </button>
              <Btn onClick={finish}>{first ? '開始使用 →' : '完成'}</Btn>
            </div>
          </>
        )}
        {!first && (
          <div style={{ borderTop: '2px dashed rgba(28,26,23,.15)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="note">重設會清走名字、選項、家務、歷史、分數同免做卡，回到全新狀態。</span>
            <button
              type="button"
              className={`btn2 danger ${armed ? 'armed' : ''}`}
              onClick={() => (armed ? resetAll() : setArmed(true))}
              onBlur={() => setArmed(false)}
            >
              {armed ? '確定重設？再撳一次即清走' : '重設所有資料'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
