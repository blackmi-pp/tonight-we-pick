import { Conditions } from './screens/Conditions';
import { History } from './screens/History';
import { Header, Home } from './screens/Home';
import { Lazy } from './screens/Lazy';
import { Result } from './screens/Result';
import { Setup } from './screens/Setup';
import { Tasks } from './screens/Tasks';
import { Vote } from './screens/Vote';
import { Wheel } from './screens/Wheel';
import { AppProvider, useApp } from './store/AppContext';

function Screens() {
  const { screen, toastMsg, saveFailed } = useApp();
  return (
    <div className="app">
      <Header />
      <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {screen === 'setup' && <Setup />}
        {screen === 'home' && <Home />}
        {screen === 'vote' && <Vote />}
        {screen === 'cond' && <Conditions />}
        {screen === 'wheel' && <Wheel />}
        {screen === 'result' && <Result />}
        {screen === 'tasks' && <Tasks />}
        {screen === 'lazy' && <Lazy />}
        {screen === 'history' && <History />}
      </main>
      {saveFailed && (
        <p className="note light" role="alert" style={{ textAlign: 'center' }}>
          ⚠️ 呢個瀏覽器存唔到資料（可能係私密瀏覽模式），關咗個 app 就會唔見。
        </p>
      )}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
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
