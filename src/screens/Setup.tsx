import { useRef, useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Btn, Card, COLORS, initial } from '../components/ui';
import { CATEGORY_LABEL, TAG_CHOICES, tagsFor } from '../data/rules';
import type { Category } from '../engine/types';
import { useApp } from '../store/AppContext';
import { sanitize } from '../store/storage';

const CATS: Category[] = ['eat', 'go', 'watch', 'custom'];
export const MAX_OPTIONS = 12;
export const MAX_LEN = 16;

function TagEditor({ category, option }: { category: Category; option: string }) {
  const { data, update } = useApp();
  const current = tagsFor(category, option, data.tags);
  const choices = TAG_CHOICES[category];
  const toggle = (t: string) => {
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    update((d) => ({ ...d, tags: { ...d.tags, [category]: { ...(d.tags[category] ?? {}), [option]: next } } }));
  };
  return (
    <div className="tag-editor">
      <div className="note" style={{ marginBottom: 6 }}>
        「{option}」係點樣嘅？貼咗標籤，條件先會影響佢。
      </div>
      <div className="pills">
        {Object.entries(choices).map(([t, label]) => (
          <button key={t} type="button" className="pill sm" aria-pressed={current.includes(t)} onClick={() => toggle(t)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OptionEditor({ category, bare = false }: { category: Category; bare?: boolean }) {
  const { data, update, toast } = useApp();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const list = data.options[category];
  const taggable = Object.keys(TAG_CHOICES[category]).length > 0;

  const add = () => {
    const v = draft.trim().slice(0, MAX_LEN);
    setDraft('');
    if (!v) return;
    if (list.includes(v)) return toast(`「${v}」已經有喇`);
    if (list.length >= MAX_OPTIONS) return toast(`每個轉盤最多 ${MAX_OPTIONS} 個選項`);
    update((d) => ({ ...d, options: { ...d.options, [category]: [...d.options[category], v] } }));
    if (taggable) setEditing(v);
  };
  const remove = (o: string) => {
    if (editing === o) setEditing(null);
    update((d) => ({ ...d, options: { ...d.options, [category]: d.options[category].filter((x) => x !== o) } }));
  };

  return (
    <div>
      {!bare && <div className="section-title">{CATEGORY_LABEL[category]}</div>}
      <div className="pills" style={{ marginBottom: 8 }}>
        {list.map((o) => {
          const n = tagsFor(category, o, data.tags).length;
          return (
            <span key={o} className="chip" aria-current={editing === o}>
              {taggable ? (
                <button type="button" className="chip-label" onClick={() => setEditing(editing === o ? null : o)}>
                  {o}
                  <small>{n ? ` ·${n}` : ' ·＋'}</small>
                </button>
              ) : (
                o
              )}
              <button type="button" aria-label={`刪走 ${o}`} onClick={() => remove(o)}>
                ×
              </button>
            </span>
          );
        })}
        {list.length === 0 && <span className="note">仲未有選項</span>}
      </div>
      {editing && list.includes(editing) && <TagEditor category={category} option={editing} />}
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
          placeholder={category === 'eat' ? '新選項（例：樓下茶記）' : '新選項'}
          enterKeyHint="done"
        />
        <button type="submit" className="btn2" style={{ flex: 'none' }}>
          ＋ 加
        </button>
      </form>
    </div>
  );
}

function Names() {
  const { data, update } = useApp();
  const setName = (p: 'A' | 'B', v: string) => update((d) => ({ ...d, users: { ...d.users, [p]: v.slice(0, 12) } }));
  return (
    <>
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
    </>
  );
}

function Backup() {
  const { data, update, toast } = useApp();
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tonight-we-pick-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed: unknown = JSON.parse(await f.text());
      const clean = sanitize(parsed);
      if (!clean.users.A && !clean.users.B && clean.history.length === 0) throw new Error('empty');
      if (!window.confirm(`用備份取代而家所有資料？（備份有 ${clean.history.length} 條紀錄）`)) return;
      update(() => ({ ...clean, setupDone: true }));
      toast('還原咗備份');
    } catch {
      toast('讀唔到呢個檔案，揀返由「匯出備份」整出嚟嘅 .json');
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <div className="settings-block">
      <div className="section-title">備份</div>
      <span className="note">
        資料只存喺呢部機。換手機、清瀏覽器資料之前，記得匯出一份；另一部機可以匯入同一份。
      </span>
      <div className="row">
        <button type="button" className="btn2" onClick={exportData}>
          ⬇︎ 匯出備份
        </button>
        <button type="button" className="btn2" onClick={() => file.current?.click()}>
          ⬆︎ 匯入備份
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importData(e.target.files?.[0])}
      />
    </div>
  );
}

function Reset() {
  const { resetAll } = useApp();
  const [armed, setArmed] = useState(false);
  return (
    <div className="settings-block">
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
  );
}

/** First run: two short steps. */
function FirstRun() {
  const { data, update, go } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <Card label={`首次設定・STEP ${step} / 2`}>
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
          <Names />
          <Btn onClick={() => setStep(2)} disabled={!data.users.A.trim() || !data.users.B.trim()}>
            下一步：設定選項 →
          </Btn>
        </>
      ) : (
        <>
          <h2 className="title">每個轉盤有咩選擇？</h2>
          <p className="sub">
            撳 × 刪走，打字加新選項（例如你哋常去嗰間餐廳）。撳選項名可以貼標籤，例如「平・近・外賣」，咁條件就會影響佢。
          </p>
          {CATS.map((c) => (
            <OptionEditor key={c} category={c} />
          ))}
          <div className="row">
            <button type="button" className="btn2" style={{ flex: 'none' }} onClick={() => setStep(1)}>
              ← 上一步
            </button>
            <Btn
              onClick={() => {
                update((d) => ({ ...d, setupDone: true }));
                go('home');
              }}
            >
              開始使用 →
            </Btn>
          </div>
        </>
      )}
    </Card>
  );
}

/** Later visits: everything on one scrollable page. */
function Settings() {
  const { go, data } = useApp();
  return (
    <>
      <Card label="設定・名字" shadow={COLORS.green}>
        <Names />
      </Card>
      <Card label="設定・轉盤選項" shadow={COLORS.yellow}>
        <p className="sub" style={{ margin: 0 }}>
          撳選項名貼標籤（·數字 = 已貼幾多個）。冇標籤嘅選項唔受條件影響，只受投票、冷卻期同評分影響。
        </p>
        {CATS.map((c) => (
          <OptionEditor key={c} category={c} />
        ))}
      </Card>
      <Card label="設定・資料" shadow={COLORS.pink}>
        <Backup />
        <Reset />
      </Card>
      <Btn onClick={() => go('home')} disabled={!data.users.A.trim() || !data.users.B.trim()}>
        完成
      </Btn>
    </>
  );
}

export function Setup() {
  const { data } = useApp();
  return (
    <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {data.setupDone ? <Settings /> : <FirstRun />}
    </div>
  );
}
