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

  const [serverLogs, setServerLogs] = useState([]);
  const [personalScore, setPersonalScore] = useState(0);


  // js goes here
  let ringers = [
    { id: 1, x: 60, y: 345, radius: 20 },
    { id: 2, x: 440, y: 400, radius: 20 },
    { id: 3, x: 620, y: 500, radius: 20 },
    { id: 4, x: 100, y: 255, radius: 20 },
    { id: 5, x: 505, y: 85, radius: 20 },
    { id: 6, x: 400, y: 255, radius: 20 },
    { id: 7, x: 725, y: 235, radius: 20 },
    { id: 8, x: 300, y: 305, radius: 20 },
    { id: 9, x: 710, y: 800, radius: 20 },
    { id: 10, x: 450, y: 840, radius: 20 },
    { id: 11, x: 270, y: 640, radius: 20 },
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
      if (serverPlayers[socket.id]) {
        //if exists
        setPersonalScore(serverPlayers[socket.id].score || 0); //updates personal score from backend counter // defaults 2 zero
      }
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

    // when 'server-log' is received from server
    socket.on("server-log", (message) => {
      // clients updates to match info from server
      // ^ in this case: broadcasts all server logs
      setServerLogs((prevLogs) => [...prevLogs, message]);
      //take all prevLogs and copy them onto new list
      // & append the newest msg just receieved
    });

    //on unmount/cleanup -> stop listening to the sockets
    return () => {
      socket.off("update-players");
      socket.off("player-threw");
      socket.off("server-log");
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

      let mapImg;
      let camera = { x: 0, y: 0, zoom: 3.2 };

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
          mapImg = await p.loadImage("/assets/map.png");
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
            setPopupMessage("Select a stake first!");
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
            setPopupMessage(`Stake on cooldown! Wait ${timeLeft}s.`);
            setTimeout(() => setPopupMessage(null), 3000);
            return;
          }

          wheel.isDragging = true;
          wheel.lastAngle = Math.atan2(p.mouseY - wheel.y, p.mouseX - wheel.x);
          return;
        }

        // check if clicked on any ringer target
        let hasClickedRinger = false;

        //calc browser mouse cords 2 world/camera mouse cords
        let worldMouseX = p.mouseX / camera.zoom + camera.x;
        let worldMouseY = p.mouseY / camera.zoom + camera.y;

        ringers.forEach((ringer) => {
          let ringerD = p.dist(worldMouseX, worldMouseY, ringer.x, ringer.y);
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
              setPopupMessage(`Stake on cooldown! Wait ${timeLeft}s.`);
              setTimeout(() => setPopupMessage(null), 3000);
              return;
            }

            selectedRinger = ringer;
            hasClickedRinger = true;

            let colors = ["0,203,206", "192,1,25", "178,127,26", "194,54,155"];
            let randomColorStr =
              colors[Math.floor(Math.random() * colors.length)];
            selectedRinger.selectedColor = randomColorStr;
          }
        });

        // if mouse is clicked on neither the wheel or a ringer then unselect target
        if (!hasClickedRinger) {
          selectedRinger = null;
        }
      };

      p.handleMovement = () => {
        // handle it locally first
        let speed = 2;
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
        let maxDist = 400;
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

      p.mouseWheel = (event) => {
        let zoomFactor = 0.01;
        let sensativity = 0.001;
        let zMin = 1.5;
        let zMax = 4.0;
        camera.zoom += sensativity * event.delta;
        camera.zoom = p.constrain(camera.zoom, zMin, zMax);
        return false;
      };

      p.draw = () => {
        p.background(20);
        // if (bgImg) {
        //   p.imageMode(p.CORNER);
        //   p.image(bgImg, 0, 0, p.width, p.height);
        // }

        let myPlayer = playersRef.current[socket.id];
        if (myPlayer) {
          // center cam on the player offset by canvas w/h
          // lerp so its not janky
          camera.x = p.lerp(
            camera.x,
            myPlayer.x - p.width / (2 * camera.zoom),
            0.1,
          );
          camera.y = p.lerp(
            camera.y,
            myPlayer.y - p.height / (2 * camera.zoom),
            0.1,
          );
        }

        p.push();
        p.scale(camera.zoom); // zoom into map
        p.translate(-camera.x, -camera.y); // fllw cam coords

        //place map
        p.image(mapImg, 0, 0, 1024, 1024);

        // place ringers onto screen
        ringers.forEach((ringer) => {
          if (ringerSvg) {
            p.imageMode(p.CENTER);
            p.image(ringerSvg, ringer.x, ringer.y, 40, 40);
          }

          // if selected, draw circle around ringer
          if (selectedRinger && selectedRinger.id === ringer.id) {
            let colorStr = selectedRinger.selectedColor || "0,203,206"; //fallback color
            let rgb = colorStr.split(",").map(Number);
            p.push();
            p.noFill();
            p.stroke(rgb[0], rgb[1], rgb[2]);
            p.strokeWeight(2);
            // draw circle centered around ringer cords
            p.ellipse(ringer.x, ringer.y, 50, 50);
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
                  console.log("stake was hit");
                  // if hit is successful, unselect ringer then
                  socket.emit("score-goal");
                  let hitRingerId = selectedRinger.id;
                  selectedRinger = null;
                  cooldownsRef.current[hitRingerId] = Date.now() + 10000; //apply 10sec cooldown 4 this ringer for this client
                  setPopupMessage(`Stake was Hit! 10s Cooldown started.`);
                  setTimeout(() => setPopupMessage(null), 4000);
                } else {
                  console.log("stake was missed ");
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
            p.image(horseshoeSvg, t.currentX, renderY, 12, 12); // draw to new pos
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
            p.image(assignedImg, 0, 0, 80, 80);
          } else {
            // fallback 2 square if image isnt loaded
            p.fill(255);
            p.noStroke();
            p.rect(-20, -20, 40, 40);
          }
          p.pop();

          // draw nicknames over the square
          p.fill(255);
          p.textSize(8);
          // p.textAlign(p.CENTER, p.TOP);
          p.text(player.nickname, player.x + 7, player.y - 25);
        });

        p.pop();
        //-----------------ui elements draw after here-----------------
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

      <div className="log-container">
        {/* server log feed */}
        <div className="log-panel">
          <div className="log-scroll-area"
          onWheel={(e) => e.stopPropagation()} >
            {serverLogs.length === 0 ? (
              <div className="log-line muted">Waiting for activity...</div>
            ) : (
              serverLogs.map((log, index) => (
                <div key={index} className="log-line">› {log}</div>
              ))
            )}
          </div>
        </div>
      </div>

        <div className="score-panel">
          <h4>SCORE</h4>
          <span className="score-number">{personalScore}</span>
        </div>

          
      {/* <div>GAME PAGE</div> */}
      <div ref={p5ContainerRef} />

    </section>
  );
}
