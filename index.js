let express = require('express');
let app = express();

let clientInput = [];



app.use(express.json());
app.use('/', express.static('public'));
