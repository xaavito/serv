var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'partidodelosmiercoles@gmail.com',
        pass: 'futbolgeba123'
    }
});

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({ a: 1 }));
});

app.post('/crear-partido', async (req, res) => {
    try {
        console.log(req.body);
        var sentMessage = JSON.parse(req.body);
        const client = await pool.connect()
        const result = await client.query('INSERT INTO partido (fecha, goles_blanco, goles_azul) values (' + sentMessage.fecha + ',0,0)');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        res.send(JSON.stringify('Partido Creado exitosamente, enviando invitaciones a los jugadores'));
        client.release();

        const mailOptions = {
            from: 'partidodelosmiercoles@gmail.com', // sender address
            to: 'danielplopez@gmail.com', // list of receivers
            subject: 'Prueba de mailer systeemmm', // Subject line
            html: '<p>a verrrrr</p>'// plain text body
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if(err)
              console.log("Error enviando mail partido " +err)
            else
              console.log("Salio el email aparentemente bien" +info);
         });
    } catch (err) {
        console.error(err);
        res.send("Error creando partido" + err);
    }
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
