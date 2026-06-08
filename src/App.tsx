import { useStore } from './state/store';
import { Home } from './components/Home';
import { GameTable } from './components/GameTable';
import { CardViewer } from './components/CardViewer';
import { CardEditor } from './components/CardEditor';
import { StatsScreen } from './components/StatsScreen';
import { Petals } from './components/Petals';

export default function App() {
  const screen = useStore((s) => s.screen);
  return (
    <>
      <Petals />
      <div className="relative z-10 mx-auto h-full max-w-md flex flex-col">
        {screen === 'home' && <Home />}
        {screen === 'game' && <GameTable />}
        {screen === 'cards' && <CardViewer />}
        {screen === 'editor' && <CardEditor />}
        {screen === 'stats' && <StatsScreen />}
      </div>
    </>
  );
}
