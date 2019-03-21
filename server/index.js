var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var app = express();

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/api/greeting', (req, res) => {
    const name = req.query.name || 'World';
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});
