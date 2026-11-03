import { useState } from 'react'
import './App.css'
import GameCanvas from './pages/game';
import StartPage from './pages/start';

export default function App() {
  const [scene, setScene] = useState(1);

  return (
    // global components can go hereeee
    <div className="">
      <GameCanvas></GameCanvas>
      <StartPage></StartPage>
    </div>
  );
}

// export default App
