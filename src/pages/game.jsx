import "./css/game.css";
import { useEffect, useState, useRef } from "react";
import p5 from "p5";

// TODO:
// hitbox is lowk buns rn
// scoring + leaderboard
// depending on where u hit in/near the hitbox determines how many points u gain
// personal score modal
// hit/miss popups
// game title
// sprites
// chatbox
// more rules : ex. user must stand x pixels away from a ringer to shoot

export default function GameCanvas({ socket, nickname }) {
  const [popupMessage, setPopupMessage] = useState(null);
  const cooldownsRef = useRef({});

  // js goes here
  let ringers = [
    { id: 1, x: 40, y: 345, radius: 40 },
    { id: 2, x: 440, y: 400, radius: 40 },
    { id: 3, x: 620, y: 145, radius: 40 },
    { id: 4, x: 100, y: 2055, radius: 40 },
    { id: 5, x: 500, y: 55, radius: 40 },
    { id: 6, x: 1040, y: 135, radius: 40 },
    { id: 7, x: 900, y: 235, radius: 40 },
    { id: 8, x: 300, y: 305, radius: 40 },
    { id: 9, x: 990, y: 585, radius: 40 },
  ];

  let wheel = {
    x: 0,
    y: 0,
    radius: 80,
    angle: 0,
    lastAngle: 0,
    power: 0,
    isDragging: false,
  };

  const p5ContainerRef = useRef(null);
  const playersRef = useRef({});
  const activeThrowsRef = useRef([]);

  useEffect(() => {
    // when 'update-players' is recived from server
    socket.on("update-players", (serverPlayers) => {
      // client updates to match info from server
      // ^ in this case: broadcasts all player locations+nicknames
      playersRef.current = serverPlayers;
    });

    // when 'player-threw' is received from server
    socket.on("player-threw", (data) => {
      // client updates to match info from server
      // ^ in this case: broadcasts all throws
      activeThrowsRef.current.push({
        startX: data.startX,
        startY: data.startY,
        targetX: data.targetX,
        targetY: data.targetY,
        currentX: data.startX,
        currentY: data.startY,
        progress: 0,
        heightOffset: 0,
        throwHeight: data.throwHeight,
        playerId: data.playerId,
      });
    });

    //on unmount/cleanup -> stop listening to the sockets
    return () => {
      socket.off("update-players");
      socket.off("player-threw");
    };
  }, [socket]);

  useEffect(() => {
    // create p5 sketch w setup/draw functions as normal
    const sketch = (p) => {
      let horseshoeSvg;
      let ringerSvg;
      let wheelSvg;
      let bgImg;
      let titleSvg;
      let selectedRinger;

      let charImgs = [];
      let playerSpriteIndexRef = {};
      let prevPlayerXRef = {};

      // async setup w await for assets
      p.setup = async () => {
        p.createCanvas(p.windowWidth, p.windowHeight);

        // center wheel at the bottom of the screen
        wheel.x = p.width / 2;
        wheel.y = p.height - 120;

        // async load the svg
        try {
          bgImg = await p.loadImage("/assets/background.png");
          titleSvg = await p.loadImage("/assets/title.svg");
          horseshoeSvg = await p.loadImage("/assets/horseshoe.svg");
          ringerSvg = await p.loadImage("/assets/pink-ringer.png");
          wheelSvg = await p.loadImage("/assets/wheel.png");

          charImgs[0] = await p.loadImage("/assets/sprite1.png");
          charImgs[1] = await p.loadImage("/assets/sprite2.png");
          charImgs[2] = await p.loadImage("/assets/sprite3.png");
          charImgs[3] = await p.loadImage("/assets/sprite4.png");
        } catch (err) {
          console.error("failed to load an image or asset:", err);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        // keep wheel centered on resize
        wheel.x = p.width / 2;
        wheel.y = p.height - 120;
      };

      // on click -> select ringer target
      p.mousePressed = () => {
        let wheelD = p.dist(p.mouseX, p.mouseY, wheel.x, wheel.y);
        if (wheelD < wheel.radius) {
          // if ringer isnt selected, cant click on wheel
          if (!selectedRinger) {
            setPopupMessage("Select a ringer first!");
            setTimeout(() => setPopupMessage(null), 3000);
            return;
          }

          // check if the selected ringer is curr on cooldown for this client
          let now = Date.now();
          if (
            cooldownsRef.current[selectedRinger.id] &&
            cooldownsRef.current[selectedRinger.id] > now
          ) {
            let timeLeft = Math.ceil(
              (cooldownsRef.current[selectedRinger.id] - now) / 1000,
            );
            setPopupMessage(`Ringer on cooldown! Wait ${timeLeft}s.`);
            setTimeout(() => setPopupMessage(null), 3000);
            return;
          }

          wheel.isDragging = true;
          wheel.lastAngle = Math.atan2(p.mouseY - wheel.y, p.mouseX - wheel.x);
          return;
        }

        // check if clicked on any ringer target
        let hasClickedRinger = false;

        ringers.forEach((ringer) => {
          let ringerD = p.dist(p.mouseX, p.mouseY, ringer.x, ringer.y);
          if (ringerD < ringer.radius) {
            // check ringer cooldown b4 allowing selection
            let now = Date.now();
            if (
              cooldownsRef.current[ringer.id] &&
              cooldownsRef.current[ringer.id] > now
            ) {
              let timeLeft = Math.ceil(
                (cooldownsRef.current[ringer.id] - now) / 1000,
              );
              setPopupMessage(`Ringer on cooldown! Wait ${timeLeft}s.`);
              setTimeout(() => setPopupMessage(null), 3000);
              return;
            }

            selectedRinger = ringer;
            hasClickedRinger = true;
          }
        });

        // if mouse is clicked on neither the wheel or a ringer then unselect target
        if (!hasClickedRinger) {
          selectedRinger = null;
        }
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

      p.mouseDragged = () => {
        //ignore if the mouse is not being dragged on the wheel
        if (!wheel.isDragging) return;

        let currentAngle = Math.atan2(p.mouseY - wheel.y, p.mouseX - wheel.x);
        let angleDelta = currentAngle - wheel.lastAngle;

        // let wheel wrap 360 degrees smoothly
        if (angleDelta > p.PI) angleDelta -= p.TWO_PI;
        if (angleDelta < -p.PI) angleDelta += p.TWO_PI;

        wheel.angle = currentAngle;
        wheel.lastAngle = currentAngle;

        // power up clockwise, down counterclockise
        if (angleDelta > 0) {
          // pushback near max power
          let pushback = Math.max(0.08, 1 - Math.pow(wheel.power / p.PI, 2));
          wheel.power = p.constrain(
            wheel.power + angleDelta * 35 * pushback,
            0,
            100,
          );
        } else {
          // pushback near 0 power
          let pushback = Math.max(
            0.08,
            1 - Math.pow((100 - wheel.power) / p.PI, 2),
          );
          wheel.power = p.constrain(
            wheel.power + angleDelta * 35 * pushback,
            0,
            100,
          );
        }
      };

      // mouse release shoots the horseshoe!
      p.mouseReleased = () => {
        //ignore if the mouse is not being dragged on the wheel
        if (!wheel.isDragging) return;
        wheel.isDragging = false; //reset var

        // then let the current player throw a shoe
        let currentPlayer = playersRef.current[socket.id];
        if (!currentPlayer) return; //ignore if no currentplayer

        // ensure selectedRinger exists b4 calculating throw
        if (!selectedRinger) return;

        let startX = currentPlayer.x + 20;
        let startY = currentPlayer.y + 20;

        // always throw in the direction/angle of the selected ringer
        let angleToRinger = p.atan2(
          selectedRinger.y - startY,
          selectedRinger.x - startX,
        );
        let requiredDist = p.dist(
          startX,
          startY,
          selectedRinger.x,
          selectedRinger.y,
        );

        // max distance corresponds 2 100 pwoer
        //power determines whether it falls short, far, or it hits it
        let maxDist = 800;
        let actualDist = (wheel.power / 100) * maxDist;

        let targetX = startX + Math.cos(angleToRinger) * actualDist;
        let targetY = startY + Math.sin(angleToRinger) * actualDist;

        let baseHeight = -70;
        let finalThrowHeight = baseHeight * (1 + wheel.power / 50); //multiply throw speed and height by power soley for visual affects

        // emit/send throw to server to broadcast
        socket.emit("throw-horseshoe", {
          startX: startX,
          startY: startY,
          targetX: targetX,
          targetY: targetY,
          throwHeight: finalThrowHeight,
        });

        // rset wheel power
        wheel.power = 0;
      };

      p.handleWheel = () => {
        p.push();
        p.translate(wheel.x, wheel.y);

        // draw wheeeeeeel
        p.rotate(wheel.angle);
        if (wheelSvg) {
          p.imageMode(p.CENTER);
          p.image(wheelSvg, 0, 0, 160, 160); //
        } else {
          p.fill(100);
          p.ellipse(0, 0, 160, 160);
        }
        p.pop();

        // power meter
        let meterWidth = 300; //
        let meterHeight = 24; //
        let fillWidth = p.map(wheel.power, 0, 100, 0, meterWidth);

        p.fill(0, 150);
        p.noStroke();
        p.rect(
          wheel.x - meterWidth / 2,
          wheel.y + 90,
          meterWidth,
          meterHeight,
          6,
        );

        p.fill(255, 180, 50);
        p.rect(
          wheel.x - meterWidth / 2,
          wheel.y + 90,
          fillWidth,
          meterHeight,
          6,
        );
      };

      // old code2 trigger throwing via spacebar (perfect hits everytime)
      // // for now, trigger throw da spacebar
      // p.keyPressed = (e) => {
      //   // if spacebar is pressed
      //   if (p.key === " " || p.keyCode === 32) {
      //     // stop browser from scrolling on spacebar press
      //     if (e) e.preventDefault();

      //     // if a ring is selected
      //     // then let the current player throw a shoe
      //     if (selectedRinger) {
      //       let currentPlayer = playersRef.current[socket.id];
      //       if (!currentPlayer) return;

      //       // emit/send throw to server to broadcast
      //       socket.emit("throw-horseshoe", {
      //         startX: currentPlayer.x + 20,
      //         startY: currentPlayer.y + 20,
      //         targetX: selectedRinger.x,
      //         targetY: selectedRinger.y,
      //       });
      //     }
      //   }
      // };

      p.draw = () => {
        p.background(20);
        if (bgImg) {
          p.imageMode(p.CORNER);
          p.image(bgImg, 0, 0, p.width, p.height);
        }

        if (titleSvg) {
          let titleWidth = 100;
          let titleHeight = 100;
          let margin = 20;

          p.imageMode(p.CORNER);
          p.image(
            titleSvg,
            p.width - titleWidth - margin,
            margin - 20,
            titleWidth,
            titleHeight,
          );
        }

        // place ringers onto screen
        ringers.forEach((ringer) => {
          if (ringerSvg) {
            p.imageMode(p.CENTER);
            p.image(ringerSvg, ringer.x, ringer.y, 80, 80);
          }

          // if selected, draw circle around ringer
          if (selectedRinger && selectedRinger.id === ringer.id) {
            p.push();
            p.noFill();
            p.stroke(255, 0, 0, 150);
            p.strokeWeight(3);
            // draw circle centered around ringer cords
            p.ellipse(ringer.x, ringer.y, 110, 110);
            p.pop();
          }

          // // the sand
          // p.fill(80, 60, 40); // dirt/sand pit color
          // p.noStroke();
          // p.rect(ringer.x - 19, ringer.y + 15, 50, 35);

          // // the pole
          // p.fill(255, 0, 0);
          // p.rect(ringer.x, ringer.y, 10, 40, 20);
        });

        // call handle player movement func
        p.handleMovement();

        

        // update & draw horseshoe trajectory if its active
        // loop thru and update all active throws in flight
        activeThrowsRef.current.forEach((t, index) => {
          t.progress += 0.02; //speeed

          //if shoe reaches target / progress = 1
          if (t.progress >= 1.0) {
            t.progress = 1.0; //stop the progress from going over 1 for maths

            // shoe linger for 2 seconds b4 fading
            if (!t.landedTime) {
              t.landedTime = Date.now();

              // check hit/miss locally if it's our own throw
              if (t.playerId === socket.id && selectedRinger) {
                //measure distance btwn where horseshoe landed and the targets radius/hitbox
                let distance = p.dist(
                  t.currentX,
                  t.currentY,
                  selectedRinger.x,
                  selectedRinger.y,
                );
                // if the distance ^^^ is within the radius then mark it as a hit
                if (distance < selectedRinger.radius) {
                  console.log("ringer was hit");
                  // if hit is successful, unselect ringer then
                  let hitRingerId = selectedRinger.id;
                  selectedRinger = null;
                  cooldownsRef.current[hitRingerId] = Date.now() + 10000; //apply 10sec cooldown 4 this ringer for this client
                  setPopupMessage(`Ringer was Hit! 10s Cooldown started.`);
                  setTimeout(() => setPopupMessage(null), 4000);
                } else {
                  console.log("ringer was missed ");
                }
              }
            }

            // keep shoe at landing spot 4 2 secs b4 removing so it can fade
            if (Date.now() - t.landedTime > 2000) {
              activeThrowsRef.current.splice(index, 1);
            }
          } else {
            // if shoe progess is less than / still moving
            // use lerp to increment x and y pos from starting pos towards target pos
            t.currentX = p.lerp(t.startX, t.targetX, t.progress);
            t.currentY = p.lerp(t.startY, t.targetY, t.progress);
            //projectile throw the shoe
            // throw along a sin curve to look projectileresque
            let throwHeight = t.throwHeight || -90; // defaults to -90
            t.heightOffset = throwHeight * p.sin(t.progress * p.PI);
          }

          let renderY = t.currentY + t.heightOffset; // apply throw curve to the y pos
          p.imageMode(p.CENTER);

          // only draw if the svg has loaded
          if (horseshoeSvg) {
            p.image(horseshoeSvg, t.currentX, renderY, 24, 24); // draw to new pos
          }
        });

        // loop thru players & draw them
        const currentPlayers = playersRef.current;
        Object.entries(currentPlayers).forEach(([id, player]) => {
          // // draw squares for now -> replace these w sprites later on
          // p.fill(255);
          // p.noStroke();
          // p.rect(player.x, player.y, 40, 40);
          // deyermine facing direction by comparing curr X to prev X pos
          let prevX = prevPlayerXRef[id] ?? player.x;
          if (player.x > prevX) {
            playerSpriteIndexRef[id + "_facing"] = "right";
          } else if (player.x < prevX) {
            playerSpriteIndexRef[id + "_facing"] = "left";
          }
          prevPlayerXRef[id] = player.x;

          let facingRight = playerSpriteIndexRef[id + "_facing"] === "right";

          p.push();
          // translate to center of player sprite for seamelss horiz flip
          p.translate(player.x + 20, player.y + 20);

          // flips them to face right (default is left)
          if (facingRight) {
            p.scale(-1, 1);
          }

          //assigned via the server so its the same across all clients 
          let spriteIdx = player.spriteIndex ?? 0;
          let assignedImg = charImgs[spriteIdx];
          if (assignedImg) {
            p.imageMode(p.CENTER);
            p.image(assignedImg, 0, 0, 240, 240);
          } else {
            // fallback 2 square if image isnt loaded
            p.fill(255);
            p.noStroke();
            p.rect(-20, -20, 40, 40);
          }
          p.pop();

          // draw nicknames over the square
          p.fill(255);
          p.textSize(20);
          // p.textAlign(p.CENTER, p.TOP);
          p.text(player.nickname, player.x, player.y - 110);
        });

        // call handle wheel func
        p.handleWheel();

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
    <section className="game-scene" style={{ position: "relative" }}>
      {popupMessage && <div className="popup">{popupMessage}</div>}
      {/* <div>GAME PAGE</div> */}
      <div ref={p5ContainerRef} />
    </section>
  );
}
