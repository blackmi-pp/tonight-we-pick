import { useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { Btn, Card } from '../components/ui';
import { ANIMAL_IMG, ANIMAL_KEYS, ANIMALS, PERSON_COLORS } from '../data/profiles';
import { CATEGORY_LABEL, TAG_CHOICES, tagsFor } from '../data/rules';
import type { Category, Person } from '../engine/types';
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
      <div style={{ marginBottom: 8 }}>「{option}」係點樣嘅？</div>
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
                  {n > 0 && <small> {n}</small>}
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
          placeholder="新選項"
          enterKeyHint="done"
        />
        <button type="submit" className="btn2" style={{ flex: 'none' }} aria-label="加選項">
          <Icon name="plus" />
        </button>
      </form>
    </div>
  );
}

export function PersonEditor({ p }: { p: Person }) {
  const { data, update } = useApp();
  const prof = data.profiles[p];
  const setName = (v: string) => update((d) => ({ ...d, users: { ...d.users, [p]: v.slice(0, 12) } }));
  const setProf = (patch: Partial<typeof prof>) =>
    update((d) => ({ ...d, profiles: { ...d.profiles, [p]: { ...d.profiles[p], ...patch } } }));
  return (
    <div className="person-editor">
      <div className="person-head">
        <Avatar p={p} size={64} />
        <input
          className="input"
          value={data.users[p]}
          onChange={(e) => setName(e.target.value)}
          placeholder="名字"
          aria-label="名字"
          autoComplete="off"
        />
      </div>
      <div>
        <div className="section-title">顏色</div>
        <div className="swatches" role="group" aria-label="顏色">
          {PERSON_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch-btn"
              style={{ background: c }}
              aria-label={c}
              aria-pressed={prof.color === c}
              onClick={() => setProf({ color: c })}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="section-title">動物</div>
        <div className="animals" role="group" aria-label="動物">
          {ANIMAL_KEYS.map((a) => (
            <button key={a} type="button" className="animal-btn" aria-pressed={prof.animal === a} onClick={() => setProf({ animal: a })}>
              {ANIMAL_IMG[a] ? <img src={ANIMAL_IMG[a]} alt={ANIMALS[a]} /> : ANIMALS[a]}
            </button>
          ))}
        </div>
      </div>
    </div>
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
      <span className="note">資料只存喺呢部機，換手機前記得匯出。</span>
      <div className="row">
        <button type="button" className="btn2" onClick={exportData}>
          <Icon name="download" size={18} />
          匯出
        </button>
        <button type="button" className="btn2" onClick={() => file.current?.click()}>
          <Icon name="upload" size={18} />
          匯入
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

/** First run: hello, one page per person, then the options. */
function FirstRun() {
  const { data, update, go } = useApp();
  const [step, setStep] = useState(0);
  const finish = () => {
    update((d) => ({ ...d, setupDone: true }));
    go('home');
  };
  if (step === 0)
    return (
      <div className="handoff" style={{ minHeight: '88dvh', justifyContent: 'center' }}>
        <Mascot mood="wave" size={200} />
        <h1 className="title">
          今晚食乜、去邊、邊個洗碗
          <br />
          交俾我揀
        </h1>
        <Btn onClick={() => setStep(1)}>開始</Btn>
      </div>
    );
  if (step === 1 || step === 2) {
    const p: Person = step === 1 ? 'A' : 'B';
    return (
      <>
        <h1 className="page-title">{step === 1 ? '你係邊個？' : '另一位係邊個？'}</h1>
        <PersonEditor p={p} />
        <div className="row">
          <button type="button" className="btn2" style={{ flex: 'none' }} onClick={() => setStep(step - 1)} aria-label="上一步">
            <Icon name="back" />
          </button>
          <Btn onClick={() => setStep(step + 1)} disabled={!data.users[p].trim()}>
            下一步
          </Btn>
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="page-title">平時會爭啲咩？</h1>
      {CATS.map((c) => (
        <Card key={c} label={CATEGORY_LABEL[c]}>
          <OptionEditor category={c} bare />
        </Card>
      ))}
      <div className="row">
        <button type="button" className="btn2" style={{ flex: 'none' }} onClick={() => setStep(2)} aria-label="上一步">
          <Icon name="back" />
        </button>
        <Btn onClick={finish}>開始使用</Btn>
      </div>
    </>
  );
}

/** 我哋: the couple, their avatars, options and data. */
function Settings() {
  const { data, names } = useApp();
  const picks = data.history.filter((h) => h.kind === 'pick').length;
  const chores = data.history.filter((h) => h.kind === 'chore').length;
  return (
    <>
      <div className="handoff" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 32px)', paddingBottom: 0, gap: 12 }}>
        <div style={{ display: 'flex' }}>
          <Avatar p="A" size={72} />
          <span style={{ marginLeft: -14, borderRadius: '50%', boxShadow: '0 0 0 4px var(--paper)', display: 'inline-flex' }}>
            <Avatar p="B" size={72} />
          </span>
        </div>
        <h1 className="title">
          {names.A} 同 {names.B}
        </h1>
      </div>
      <div className="stat-row">
        <div>
          <b>{picks}</b>
          <span>次決定</span>
        </div>
        <div>
          <b>{chores}</b>
          <span>次家務</span>
        </div>
        <div>
          <b>{data.watchlist.length}</b>
          <span>套想睇</span>
        </div>
      </div>
      {(['A', 'B'] as const).map((p) => (
        <Card key={p} label={names[p]}>
          <PersonEditor p={p} />
        </Card>
      ))}
      <Card label="轉盤選項">
        {CATS.map((c) => (
          <OptionEditor key={c} category={c} />
        ))}
      </Card>
      <Card label="資料">
        <Backup />
        <Reset />
      </Card>
      <p className="credit">
        吉祥物 by{' '}
        <a href="https://sipp.com.hk" target="_blank" rel="noopener noreferrer">
          sipp.
        </a>
      </p>
    </>
  );
}

export function Setup() {
  const { data } = useApp();
  return <div className="narrow">{data.setupDone ? <Settings /> : <FirstRun />}</div>;
}
