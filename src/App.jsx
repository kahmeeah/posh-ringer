import React, { useState, useEffect } from "react";
import "./App.css";
import GameCanvas from "./pages/game";
import StartPage from "./pages/start";
import { socket } from "./socket";

export default function App() {
  const [nickname, setNickname] = useState("");
  const [playerJoined, setPlayerJoined] = useState(false);
  const handleJoin = () => {
    // tell server the nickname of the client
    socket.emit("player-join", nickname);
    // set joined state to true, to toggle the page state
    setPlayerJoined(true);
  };

  return (
    // global components can go hereeee
    <div className="">
      {/* if player hasnt joined show startpage, else load the game */}
      {!playerJoined ? (
        <StartPage
          socket={socket}
          nickname={nickname}
          setNickname={setNickname}
          onJoin={handleJoin}
        />
      ) : (
        <GameCanvas socket={socket} nickname={nickname} />
      )}
    </div>
  );
}

// export default App
