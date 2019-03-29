var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();
var nodemailer = require('nodemailer');

// CONFIGURACION DE CONEXION DE MAILS
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'partidodelosmiercoles@gmail.com',
        pass: 'futbolgeba123'
    }
});

// METODO QUE GENERA EL NUEVO PARTIDO, ARMA LA LISTA DE INVITADOS Y LAS INSERTA EN LA BD
const generarNuevoPartido = async (pool, fecha) => {
    console.log("Generar nuevo partido!");
    const client = await pool.connect()
    const queryInsertarPartido = {
        text: 'INSERT INTO partido (fecha, goles_blanco, goles_azul) values (to_date($1,\'DD/MM/YYYY\'),0,0)',
        values: [fecha]
    }
    await client.query(queryInsertarPartido);
    console.log("post insert");

    const jugadores = await client.query('SELECT * FROM jugador');
    console.log("post jugadores");
    jugadores.rows.forEach(function (jugador) {
        console.log(jugador.id);
        console.log(jugador.nombre);
        //ACA DEBERIAMOS HACER UN INSERT EN JUGADOR PARTIDO CON CADA UNO DE ESTOS.
    });
    console.log("pre release");
    client.release();
}

// ACCESO A LA BD
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

// PARA EVITAR EL TEMA DE LA RESTRICCION DE DONDE LE PEGAN MUCHO BARDO CON LOCALHOST
app.use(cors());

// PINO LOGGER
app.use(pino);

// PARSEO MAGICO DE JSON DEL BODY
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: false })); // support encoded bodies

// METODO BASURA PARA PROBAR
app.get('/', function (req, res) {
    res.send('Bievenido al sistema de creacion y confirmacion de partidos de los miercoles');
});

// METODO BASURA PARA PROBAR
app.post('/api/greeting', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({ a: 1 }));
});

// METODO ADMIN PARA GENERAR EL EVENTO
app.post('/crear-partido', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        generarNuevoPartido(pool, req.body.fecha);

        //move to cco??
        const mailOptions = {
            from: 'partidodelosmiercoles@gmail.com', // sender address
            //to: 'danielplopez@gmail.com; javiermartingonzalez@gmail.com; nicolaspmoreira@gmail.com; matyluzzi@gmail.com', // list of receivers
            to: 'javiermartingonzalez@gmail.com', // list of receivers
            subject: 'Partido de los Miercoles, Fecha: ' + req.body.fecha, // Subject line
            html: 'Por favor, confirma yendo a <a href="https://fulbapp-cli.herokuapp.com/?id=10000">este</a> link y eligiendo si Confirmas, Suplente o Baja \n TODOS LOS DERECHOS RESERVADOS PARA JAVICORP'
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err)
                console.log("Error enviando mail partido " + err)
            else
                console.log("Salio el email aparentemente bien " + info);
        });

        res.send(JSON.stringify('Partido Creado exitosamente, enviando invitaciones a los jugadores'));
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO BASURA
app.get('/db', async (req, res) => {
    try {
        const client = await pool.connect()
        const result = await client.query('SELECT * FROM partido');
        result.rows.forEach(function (element) {
            console.log(element);
        });
        //const results = { 'results': (result) ?  : null };
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
