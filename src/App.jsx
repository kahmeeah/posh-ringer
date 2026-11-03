import React, { useState, useEffect } from 'react';
import './App.css'
import GameCanvas from './pages/game';
import StartPage from './pages/start';
import { socket } from './socket';

export default function App() {

  return (
    // global components can go hereeee
    <div className="">
      <GameCanvas></GameCanvas>
      <StartPage></StartPage>
    </div>
  );
}

// export default App
