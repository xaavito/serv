var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();
var nodemailer = require('nodemailer');

// CONFIGURACION DE CONEXION DE MAILS
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'partidodelosmiercoles@gmail.com',
        pass: 'futbolgeba123'
    }
});

// METODO QUE GENERA EL NUEVO PARTIDO, ARMA LA LISTA DE INVITADOS Y LAS INSERTA EN LA BD
const generarNuevoPartido = async (pool, fecha, transporter) => {
    try {
        console.log("Generar nuevo partido!");
        const client = await pool.connect()
        //INSERTO EL NUEVO PARTIDO
        const queryInsertarPartido = {
            text: 'INSERT INTO partido (fecha, goles_blanco, goles_azul) values (to_date($1,\'DD/MM/YYYY\'),0,0)',
            values: [fecha]
        }
        await client.query(queryInsertarPartido);

        //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
        const partido = await client.query('select max(id) id_partido from partido');

        const id_partido = partido.rows[0].id_partido;

        //TRAIGO TODOS LOS JUGADORES A LOS QUE SE LES VA A MANDAR LA INVITACION
        const jugadores = await client.query('SELECT * FROM jugador');

        //INSERTO A TODOS LOS JUGADORES EN LA INVITACION COMO BAJA
        jugadores.rows.forEach(async (jugador) => {
            const queryInsertarJugadorPartido = {
                text: 'insert into partido_jugador( id_partido, id_jugador, asistio, condicion) values ($1,$2, $3, $4)',
                values: [id_partido, jugador.id, false, 'B']
            };
            await client.query(queryInsertarJugadorPartido);
        });

        //LOS TRAIGO A ESOS JUGADORES RECIEN INSERTADOS
        const queryJugadoresPorPartido = {
            text: 'SELECT * FROM partido_jugador where id_partido = $1',
            values: [id_partido]
        };

        const jugadoresPorPartido = await client.query(queryJugadoresPorPartido);
        console.log("post jugadores");
        jugadoresPorPartido.rows.forEach(async (jugador) => {
            //POR CADA UNO TRAIGO SU INFORMACION POSTA
            const infoJugador = {
                text: 'SELECT * FROM jugador where id = $1',
                values: [jugador.id_jugador]
            };
            const queryJugador = await client.query(infoJugador);
            //LES MANDO UN EMAIL CON SU CODIGO PARTICULAR.
            const mailOptions = {
                from: 'partidodelosmiercoles@gmail.com',
                to: queryJugador.rows[0].mail,
                subject: 'Partido de los Miercoles, Fecha: ' + fecha,
                html: 'Por favor, confirma yendo a <a href="https://fulbapp-cli.herokuapp.com/?id=' + jugador.jugador_partido_id + '">este</a> link y eligiendo si Confirmas, Suplente o Baja \n TODOS LOS DERECHOS RESERVADOS PARA JAVICORP'
            };

            transporter.sendMail(mailOptions, function (err, info) {
                if (err)
                    console.log("Error enviando mail partido " + err)
                else
                    console.log("Salio el email aparentemente bien " + info);
            });
        });
        client.release();
    }
    catch (err) {
        client.release();
        throw err;
    }
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
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.send(JSON.stringify({ a: 1 }));
});

// METODO ADMIN PARA GENERAR EL EVENTO
app.post('/crear-partido', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

        generarNuevoPartido(pool, req.body.fecha, transporter);

        res.send('Partido Creado exitosamente, enviando invitaciones a los jugadores');
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO para devolver el nombre del usuario
app.post('/get-user-name', async (req, res) => {
    try {
        console.log("Obtener el nombre del user ID: " + req.body.id);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

        if (req.body.id) {

            const client = await pool.connect()

            //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
            const queryBuscarNombre = {
                text: 'select nombre from jugador where id = $1',
                values: [req.body.id]
            }
            const resultadoNombre = await client.query(queryBuscarNombre);

            const nombre = resultadoNombre.rows[0].nombre;

            res.send(nombre);
            client.release();
        } else {
            res.send("No hay ID a buscar")
        }
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
        client.release();
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
