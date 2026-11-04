import "./css/game.css";
import { useEffect, useState, useRef } from "react";
import p5 from "p5";

export default function GameCanvas({ socket, nickname }) {
  // js goes here
  let ringers = [
    { id: 1, x: 40, y: 345, radius: 25 },
    { id: 2, x: 440, y: 400, radius: 25 },
    { id: 3, x: 620, y: 145, radius: 25 },
    { id: 4, x: 100, y: 35, radius: 25 },
  ];

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
      let horseshoeSvg;
      let selectedRinger;

      //horseshoe obj to track starting pos, target pos, and current pos
      let horseshoe = {
        active: false,
        startX: 0,
        startY: 0,
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        progress: 0, //
        heightOffset: 0,
      };

      // async setup w await for assets
      p.setup = async () => {
        p.createCanvas(800, 600);

        // async load the svg
        try {
          horseshoeSvg = await p.loadImage("/assets/horseshoe.svg");
        } catch (err) {
          console.error("failed to load horseshoe svg:", err);
        }
      };

      // on click -> select ringer target
      p.mousePressed = () => {
        // only allow click on targets if a throw isn't currently being thrown
        if (horseshoe.active) return;

        ringers.forEach((ringer) => {
          let d = p.dist(p.mouseX, p.mouseY, ringer.x, ringer.y);
          if (d < ringer.radius) {
            selectedRinger = ringer;
            console.log(`Target locked: ${ringer.name}`);
          }
        });
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
          p.keyIsDown(65) ||
          p.keyIsDown(97)
        ) {
          // left / A / a
          moveData.x -= speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.RIGHT_ARROW) ||
          p.keyIsDown("D") ||
          p.keyIsDown("d") ||
          p.keyIsDown(68) ||
          p.keyIsDown(100)
        ) {
          // right / D / d
          moveData.x += speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.UP_ARROW) ||
          p.keyIsDown("W") ||
          p.keyIsDown("w") ||
          p.keyIsDown(87) ||
          p.keyIsDown(119)
        ) {
          // up / W / w
          moveData.y -= speed;
          moved = true;
        }
        if (
          p.keyIsDown(p.DOWN_ARROW) ||
          p.keyIsDown("S") ||
          p.keyIsDown("s") ||
          p.keyIsDown(83) ||
          p.keyIsDown(115)
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

      // for now, trigger throw da spacebar
      p.keyPressed = (e) => {
        // if spacebar is pressed
        if (p.key === " " || p.keyCode === 32) {
          // stop browser from scrolling on spacebar press
          if (e) e.preventDefault();

          // if there isnt a current shoe being thrown & a ring is selected
          // then let the current player throw a shoe
          if (!horseshoe.active && selectedRinger) {
            let currentPlayer = playersRef.current[socket.id];
            if (!currentPlayer) return;

            horseshoe.active = true; // shoe is being thrown
            horseshoe.startX = currentPlayer.x + 20; // start 20 pts from players curr x pos
            horseshoe.startY = currentPlayer.y + 20; // start 20 pts from players curr y pos
            horseshoe.targetX = selectedRinger.x; // set targetX to match the selectedRinger's x
            horseshoe.targetY = selectedRinger.y; // set targetY to match the selectedRinger's y
            horseshoe.currentX = horseshoe.startX; // current starts off at starting pos
            horseshoe.currentY = horseshoe.startY; // current starts off at starting pos
            horseshoe.progress = 0; // progress starts at 0, and will be incremented until 1 , where 1 = target is reached
          }
        }
      };

      p.draw = () => {
        p.background(20);

        // place ringers onto screen
        ringers.forEach((ringer) => {
          // if selected, draw circle around ringer
          if (selectedRinger && selectedRinger.id === ringer.id) {
            p.noFill();
            p.stroke(255, 200, 50, 150);
            p.strokeWeight(3);
            p.ellipse(ringer.x + 10, ringer.y + 10, 80, 80);
          }

          // the sand
          p.fill(80, 60, 40); // dirt/sand pit color
          p.noStroke();
          p.rect(ringer.x - 19, ringer.y + 15, 50, 35);

          // the pole
          p.fill(255, 0, 0);
          p.rect(ringer.x, ringer.y, 10, 40, 20);
        });

        // call handle player movement func
        p.handleMovement();

        // update & draw horseshoe trajectory if its active
        if (horseshoe.active) {
          horseshoe.progress += 0.02; //speeed

          //if shoe reaches target / progress = 1
          if (horseshoe.progress >= 1.0) {
            horseshoe.progress = 1.0; //stop the progress from going over 1 for maths
            horseshoe.active = false; // reset var / shoe is no longer moving & wont be drawn on next frame

            if (selectedRinger) {
              //measure distance btwn where horseshoe landed and the targets radius/hitbox
              let distance = p.dist(
                horseshoe.currentX,
                horseshoe.currentY,
                selectedRinger.x,
                selectedRinger.y,
              );
              // if the distance ^^^ is within the radius then mark it as a hit
              if (distance < selectedRinger.radius) {
                console.log("ringer was hit");
              } else {
                console.log("ringer was missed ");
              }
            }
          } else {
            // if shoe progess is less than / still moving
            // use lerp to increment x and y pos from starting pos towards target pos
            horseshoe.currentX = p.lerp(
              horseshoe.startX,
              horseshoe.targetX,
              horseshoe.progress,
            );
            horseshoe.currentY = p.lerp(
              horseshoe.startY,
              horseshoe.targetY,
              horseshoe.progress,
            );
            //projectile throw the shoe
            // throw along a sin curve to look projectileresque
            let throwHeight = -90; // probably have wheelstrength affect this later
            horseshoe.heightOffset =
              throwHeight * p.sin(horseshoe.progress * p.PI);
          }

          let renderY = horseshoe.currentY + horseshoe.heightOffset; // apply throw curve to the y pos
          p.imageMode(p.CENTER);

          // only draw if the svg has loaded
          if (horseshoeSvg) {
            p.image(horseshoeSvg, horseshoe.currentX, renderY, 24, 24); // draw to new pos
          }
        }

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
