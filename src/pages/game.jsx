import './css/game.css'
import { useEffect, useState, useRef } from 'react';
import p5 from 'p5';

export default function GameCanvas({socket, nickname}) {
    // js goes here

    const p5ContainerRef = useRef(null);
    const playersRef = useRef({});

    useEffect(() =>{
      // when 'update-players' is recived from server
      socket.on('update-players', (serverPlayers) => {
        // client updates to match info from server
        playersRef.current = serverPlayers;
      })

      //on unmount/cleanup -> stop listening to 'update-players'
      return() => {
        socket.off('update-players')
      }

    }, [socket])


    useEffect(() => {
      // create p5 sketch w setup/draw functions as normal
        const sketch = (p) => {

            p.setup = () => {
                p.createCanvas(800, 600);
            };

            p.draw = () => {
                p.background(20);

                // loop thru players & draw them
                const currentPlayers = playersRef.current;
                Object.values(currentPlayers).forEach((player) => {
                    // draw squares for now -> replace these w sprites later on
                    p.fill(255);
                    p.noStroke();
                    p.rect(player.x, player.y, 100, 100);

                    // draw nicknames over the square
                    p.fill(255);
                    p.textSize(14);
                    p.text(player.nickname, player.x, player.y - 8);
                });
            };
        };

        // mount p5 sketch to container div
        const myP5 = new p5(sketch, p5ContainerRef.current);

        // cleanup on unmount
        return () => {
            myP5.remove();
        };
    }, []);

  return (
    <section className="game-scene">
      <div>GAME PAGE</div>
      <div 
      ref={p5ContainerRef} 
      />
    </section>
  );
}