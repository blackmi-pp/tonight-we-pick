import { TabBar, TAB_SCREENS } from './components/Nav';
import { Conditions } from './screens/Conditions';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Lazy } from './screens/Lazy';
import { Result } from './screens/Result';
import { Setup } from './screens/Setup';
import { Tasks } from './screens/Tasks';
import { Vote } from './screens/Vote';
import { Wheel } from './screens/Wheel';
import { AppProvider, useApp } from './store/AppContext';

function Screens() {
  const { screen, toastMsg, dismissToast, saveFailed, data } = useApp();
  const tabs = data.setupDone && TAB_SCREENS.includes(screen);
  return (
    <div className={`app ${tabs ? 'has-tabs' : ''} ${screen === 'home' ? 'no-pad' : ''}`}>
      <main>
        {screen === 'setup' && <Setup />}
        {screen === 'home' && <Home />}
        {screen === 'vote' && <Vote />}
        {screen === 'cond' && <Conditions />}
        {screen === 'wheel' && <Wheel />}
        {screen === 'result' && <Result />}
        {screen === 'tasks' && <Tasks />}
        {screen === 'lazy' && <Lazy />}
        {screen === 'history' && <History />}
        {saveFailed && (
          <p className="note" role="alert" style={{ textAlign: 'center', padding: '0 20px' }}>
            呢個瀏覽器存唔到資料，可能係私密瀏覽模式。關咗個 app 就會唔見。
          </p>
        )}
      </main>
      {tabs && <TabBar />}
      {toastMsg && (
        <div className="toast" role="status">
          <span>{toastMsg.msg}</span>
          {toastMsg.action && (
            <button
              type="button"
              onClick={() => {
                toastMsg.action!.run();
                dismissToast();
              }}
            >
              {toastMsg.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  );
}
