import express from "express";
const app = express();

import path from "path";
import cors from "cors";

import { createServer } from "node:http";
import { Server } from "socket.io";

app.use("/", express.static("public"));

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from the root 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback for Express 5
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.use(cors());
app.use(express.json());

const players = {};

// init http server
const server = createServer(app);
//init socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // vite/frontend port
    methods: ["GET", "POST "],
  },
});

//Listen for a client to connect and disconnect
//(io.on = server.recieve)
io.on("connection", (socket) => {
  console.log("We have a new client: " + socket.id);

  //Listen for messages from the client

  //Listen for an event named 'message' from client
  //(socket.on = client.recieve)
  socket.on("message", (data) => {
    console.log("Received 'message' with the following data:");
    console.log(data);

    //Send data to ALL clients, including this one
    //(io.on = server.send)
    io.emit("message-share", data);
  });

  // listen for when player joins
  socket.on("player-join", (nickname) => {
    console.log("Received 'player-join' with the following nickname: ");
    console.log(nickname); 

    // store their initial x.y cords & nickname so that we can emit it
    players[socket.id] = {
      id: socket.id,
      nickname: nickname,
      x: 500,
      y: 510,
      spriteIndex: Math.floor(Math.random() * 4),//assign sprite
      score: 0,
    };
    // emit client's nickname and location to everyone
    io.emit("update-players", players);
    console.log("Current player list: ");
    console.log(players);

        //send msg to everyone
    io.emit("server-log", `${nickname} joined the game.`);
    console.log("server-log", `${nickname} joined the game.`)
  });

  //listen for when player moves
  socket.on("player-move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;

      //emit updated positions to everyone
      io.emit("update-players", players);
    }
  });

  //listen for when player throws a shoe
  socket.on("throw-horseshoe", (data) => {
    // emit throw to everyone
    io.emit("player-threw", {
      playerId: socket.id,
      startX: data.startX,
      startY: data.startY,
      targetX: data.targetX,
      targetY: data.targetY,
    });
  });

  //listen for when player makes a goal
  socket.on("score-goal", () => {
    players[socket.id].score += 1;
    //announce to everyone
    io.emit(
      "server-log",
      `${players[socket.id].nickname} scored a point! (Total: ${players[socket.id].score})`,
    );
    //update players / save score
    io.emit("update-players", players);

    // search thru all players and find one w highest score
    io.emit(
      "server-log",
      `${players[socket.id].nickname} is leading with ${players[socket.id].score} points!`,
    );
  });

  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
    let playerName = players[socket.id]?.nickname;
    if (playerName) {
      io.emit("server-log", `${playerName} has left the game.`);
    }


    // remove player nickname/location from screen
    delete players[socket.id];
    io.emit("update-players", players); // update everyone
    //send msg to everyone
   
  });
});

// register default route
app.get("/", (req, res) => {
  res.send("posh ringer api");
});

// start server
let port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// TODO:
// 1. make basic sockets
// 1. make basic game mechanics
// 2. connect sockets
// 3. make single
// make two player queue w ig waiting for second player screen (make a room)
// 4.
