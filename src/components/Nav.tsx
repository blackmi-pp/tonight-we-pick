import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { useApp, type Screen } from '../store/AppContext';

const TABS: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'home', label: '首頁', icon: 'home' },
  { s: 'tasks', label: '家務', icon: 'chores' },
  { s: 'history', label: '紀錄', icon: 'history' },
  { s: 'setup', label: '我哋', icon: 'us' },
];
export const TAB_SCREENS: Screen[] = TABS.map((t) => t.s);

export function TabBar() {
  const { screen, go } = useApp();
  return (
    <nav className="tabbar" aria-label="主要分頁">
      {TABS.map((t) => (
        <button key={t.s} type="button" aria-current={screen === t.s ? 'page' : undefined} onClick={() => go(t.s)}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Top bar for full-screen flows (vote → wheel → result, lazy mode). */
export function FlowBar({ title, right }: { title: ReactNode; right?: ReactNode }) {
  const { go } = useApp();
  return (
    <div className="flowbar">
      <button type="button" className="iconbtn" aria-label="返首頁" onClick={() => go('home')}>
        <Icon name="close" />
      </button>
      <span className="flowbar-title">{title}</span>
      <span className="flowbar-right">{right}</span>
    </div>
  );
}
