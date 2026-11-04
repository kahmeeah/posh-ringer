import './css/game.css'
import { useEffect, useState, useRef } from 'react';
export default function GameCanvas({socket, nickname}) {
    // js goes here
    const [players, setPlayers] = useState({})
    const canvasRef = useRef(null)

    useEffect(() =>{
      // when 'update-players' is recived from server
      socket.on('update-players', (serverPlayers) => {
        // client updates to match info from server
        setPlayers(serverPlayers)
      })

      //on unmount/cleanup -> stop listening to 'update-players'
      return() => {
        socket.off('update-players')
      }

    }, [socket])

    useEffect(() => {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      // clear canvas evry frame
      context.clearRect(0, 0, canvas.width, canvas.height);

      // for each client, 
      Object.values(players).forEach((player) => {
      // draw a square
      context.fillStyle = '#fff'; // 
      context.fillRect(player.x, player.y, 40, 40);

      // draw their nickname
      context.fillStyle = '#fff';
      context.font = '14px sans-serif';
      context.fillText(player.nickname, player.x, player.y - 8);
    });

    }, [players])


  return (
    <section className="game-scene">
      <div>GAME PAGE</div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600} 
        style={{ border: '2px solid #333' }}
      />
    </section>
  );
}