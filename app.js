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
    };
    // emit client's nickname and location to everyone
    io.emit("update-players", players);
    console.log("Current player list: ");
    console.log(players);
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

  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);

    // remove player nickname/location from screen
    delete players[socket.id];
    io.emit("update-players", players); // update everyone
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
