import express from 'express';
const app = express()

import path from 'path';
import cors from 'cors';

app.use("/", express.static("public"));

app.use(cors());
app.use(express.json());

// register default route
app.get('/', (req, res) => {
    res.send('posh ringer api');
});

// start server 
let port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})

// TODO:
// 1. make basic game mechanics
// 2. connect sockets
// 3. make single 
// make two player queue w ig waiting for second player screen (make a room)
// 4. 