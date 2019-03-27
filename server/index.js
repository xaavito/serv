var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

app.use(cors());

app.get('/', function (req, res) {
    res.send('Bievenido sl sistema de creacion y confirmacion de partidos de los miercoles');
});

app.post('/api/greeting', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000/');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({ a: 1 }));
});

app.post('/crear-partido', (req, res) => {
    try {
        const client = await pool.connect()
        const result = await client.query('INSERT INTO partido (fecha, goles_blanco, goles_azul) values (' + req.body.fecha + ',0,0)');
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000/');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(JSON.stringify('Partido Creado exitosamente'));
});

app.get('/db', async (req, res) => {
    try {
        const client = await pool.connect()
        const result = await client.query('SELECT * FROM partido');
        const results = { 'results': (result) ? result.rows : null };
        res.send(JSON.stringify(results));
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

app.listen(process.env.PORT || 5001, function () {
    console.log('Example app listening on port ....!');
});
