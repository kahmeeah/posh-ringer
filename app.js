import express from 'express';
const app = express()

import path from 'path';
import cors from 'cors';

import { createServer } from 'node:http';
import { Server } from 'socket.io';

app.use("/", express.static("public"));

app.use(cors());
app.use(express.json());

// init http server
const server = createServer(app);
//init socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // vite/frontend port
        methods: ["GET", "POST "]
    }
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
    io.emit('message-share', data);


  });

  //Listen for this client to disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected: " + socket.id);
  });
});

// register default route
app.get('/', (req, res) => {
    res.send('posh ringer api');
});

// start server 
let port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})

// TODO:
// 1. make basic sockets
// 1. make basic game mechanics
// 2. connect sockets
// 3. make single 
// make two player queue w ig waiting for second player screen (make a room)
// 4. 