var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();

app.use(cors());

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/api/greeting', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000/');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({ a: 1 }));
});

app.listen(process.env.PORT || 5001, function () {
    console.log('Example app listening on port ....!');
});
