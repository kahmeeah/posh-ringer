import "./css/game.css";
import { useEffect, useState, useRef } from "react";
import p5 from "p5";

export default function GameCanvas({ socket, nickname }) {
  // js goes here

  const p5ContainerRef = useRef(null);
  const playersRef = useRef({});

  useEffect(() => {
    // when 'update-players' is recived from server
    socket.on("update-players", (serverPlayers) => {
      // client updates to match info from server
      playersRef.current = serverPlayers;
    });

    //on unmount/cleanup -> stop listening to 'update-players'
    return () => {
      socket.off("update-players");
    };
  }, [socket]);

  useEffect(() => {
    // create p5 sketch w setup/draw functions as normal
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(800, 600);
      };

      p.handleMovement = () => {
        // handle it locally first
        let speed = 4;
        let moved = false;
        let moveData = { x: 0, y: 0 };

        // check if wasd or arrow keys r held down
        // wasd lowk not working but 2 lazy to debug why rn
        if (
          p.keyIsDown(p.LEFT_ARROW) ||
          p.keyIsDown("A") ||
          p.keyIsDown("a") ||
          keyIsDown(65) ||
          keyIsDown(97)
        ) {
          // left / A / a
          moveData.x -= speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.RIGHT_ARROW) ||
          p.keyIsDown("D") ||
          p.keyIsDown("d") ||
          keyIsDown(68) ||
          keyIsDown(100)
        ) {
          // right / D / d
          moveData.x += speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.UP_ARROW) ||
          p.keyIsDown("W") ||
          p.keyIsDown("w") ||
          keyIsDown(87) ||
          keyIsDown(119)
        ) {
          // up / W / w
          moveData.y -= speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.DOWN_ARROW) ||
          p.keyIsDown("S") ||
          p.keyIsDown("s") ||
          keyIsDown(83) ||
          keyIsDown(115)
        ) {
          // down / S / s
          moveData.y += speed;
          moved = true;
        }

        // if player moved, send/emit it to the server
        if (moved) {
          socket.emit("player-move", moveData);
        }
      };

      p.draw = () => {
        p.background(20);

        // call handle player movement func
        p.handleMovement();

        // loop thru players & draw them
        const currentPlayers = playersRef.current;
        Object.values(currentPlayers).forEach((player) => {
          // draw squares for now -> replace these w sprites later on
          p.fill(255);
          p.noStroke();
          p.rect(player.x, player.y, 40, 40);

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
  }, [socket]);

  return (
    <section className="game-scene">
      <div>GAME PAGE</div>
      <div ref={p5ContainerRef} />
    </section>
  );
}
