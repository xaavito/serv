var express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
var cors = require('cors');
var app = express();
var nodemailer = require('nodemailer');

var http = require('https');

function startKeepAlive() {
    setInterval(function () {
        var hour = new Date().getHours();
        var day = new Date().getDay();
        //Estara activo sin dormir desde las 7 am hasta las 12 de lunes a miercoles.
        if (hour >= 7 && day >= 1 && day <= 3) {
            console.log("startKeepAlive CLI");
            var options = {
                host: 'fulbapp-cli.herokuapp.com',
                port: 443,
                path: '/'
            };
            http.get(options, function (res) {
                res.on('data', function (chunk) {
                    try {
                        // optional logging... disable after it's working
                        console.log("HEROKU RESPONSE: " + chunk);
                    } catch (err) {
                        console.log(err.message);
                    }
                });
            }).on('error', function (err) {
                console.log("Error: " + err.message);
            });
        }
    }, 1000 * 60 * 20);

    setInterval(function () {
        var hour = new Date().getHours();
        var day = new Date().getDay();
        //Estara activo sin dormir desde las 7 am hasta las 12 de lunes a miercoles.
        if (hour >= 7 && day >= 1 && day <= 3) {
            console.log("startKeepAlive SERV");
            var options = {
                host: 'fulbapp-serv.herokuapp.com',
                port: 443,
                path: '/'
            };
            http.get(options, function (res) {
                res.on('data', function (chunk) {
                    try {
                        // optional logging... disable after it's working
                        console.log("HEROKU RESPONSE: " + chunk);
                    } catch (err) {
                        console.log(err.message);
                    }
                });
            }).on('error', function (err) {
                console.log("Error: " + err.message);
            });
        }
    }, 1000 * 60 * 20);
}

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
    const client = await pool.connect();
    try {
        console.log("generarNuevoPartido");

        console.log(fecha);
        const fec = new Date(fecha);
        console.log(fec.toDateString());

        //BUSCO EL ID DEL PARTIDO anterior
        const partido_anterior = await client.query('select max(id) id_partido from partido');

        const id_partido_anterior = partido_anterior.rows[0].id_partido;

        //BUSCO LA CANTIDAD DE INVITADOS DEL PARTIDO ANTERIOR
        const queryInvitadosPartidoAnterior = {
            text: 'SELECT COUNT(1) cantidad_invitados FROM partido_jugador WEHERE jugador_id IS NULL AND id_partido = $1',
            values: [id_partido_anterior]
        }
        const invitadosPartidoAnterior = await client.query(queryInvitadosPartidoAnterior);

        const cantidad_invitados = invitadosPartidoAnterior.rows[0].cantidad_invitados;

        //INSERTO EL NUEVO PARTIDO
        const queryInsertarPartido = {
            text: 'INSERT INTO partido (fecha, goles_blanco, goles_azul, invitados_pndientes) values (to_date($1,\'DD/MM/YYYY\'), 0, 0, $2)',
            values: [fecha, cantidad_invitados]
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
                text: 'insert into partido_jugador( id_partido, id_jugador, asistio, condicion, nombre) values ($1, $2, $3, $4, $5)',
                values: [id_partido, jugador.id, true, 'B', jugador.nombre + ' ' + jugador.apellido]
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
                subject: 'Partido de los Miercoles, Fecha: ' + fecha + ' - ⚽️ - Hora: 19:45',
                html: 'Que tal ' + queryJugador.rows[0].nombre +
                    '? Por favor, confirma yendo a <a href="https://fulbapp-cli.herokuapp.com/Confirmar?id=' +
                    jugador.jugador_partido_id + '">este</a> link y eligiendo si Confirmas, Suplente o Baja <br />' +
                    'TODOS LOS DERECHOS RESERVADOS PARA JAVICORP<br/>' +
                    'Se donde viven todos, si todos, y mas que nada vos, ' + queryJugador.rows[0].nombre + ' asi que veni no seas gil.'
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
        console.log(err);
        throw err;
    }
}

// METODO para AGREGAR INVITADO
const agregarNuevoInvitado = async (pool, invitado, transporter) => {
    const client = await pool.connect();
    try {
        console.log("agregarNuevoInvitado");

        //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
        const partido = await client.query('select max(id) id_partido, to_char( fecha, \'DD/MM/YYYY\') fecha  from partido group by fecha order by fecha desc');
        const id_partido = partido.rows[0].id_partido;
        const fecha = partido.rows[0].fecha;

        //INSERTO EL NUEVO INVITADO como confirmado
        const queryNuevoInvitado = {
            text: 'insert into partido_jugador (id_partido, id_jugador, nombre, asistio, condicion) values ($1, $2, $3, $4, $5)',
            values: [id_partido, 000, invitado.nombre, true, 'C']
        }
        await client.query(queryNuevoInvitado);

        if (invitado.email) {
            //SI TIENE MAIL LO INSERTO EN JUGADORES PARA LA PROXIMA
            const queryNuevoInvitado = {
                text: 'insert into jugador (nombre, apellido, mail, telefono) values ($1, $2, $3, $4)',
                values: [invitado.nombre, 'INVITADO', invitado.email, '55555555']
            }
            await client.query(queryNuevoInvitado);

            const mailOptions = {
                from: 'partidodelosmiercoles@gmail.com',
                to: invitado.email,
                subject: 'Partido de los Miercoles, Fecha: ' + fecha,
                html: 'USTED HA SIDO CONFIRMADO AL PARTIDO!'
            };

            transporter.sendMail(mailOptions, function (err, info) {
                if (err)
                    console.log("Error enviando mail partido " + err)
                else
                    console.log("Salio el email aparentemente bien " + info);
            });
        }
        client.release();
    }
    catch (err) {
        client.release();
        console.log(err);
        throw err;
    }
}

// METODO para obtener el estado del jugador en el anterior partido
const buscarEstadoAnterior = async (pool, jugador) => {
    const client = await pool.connect();
    try {
        console.log("buscarEstadoAnterior");

        //BUSCO EL ID DEL PARTIDO MAS RECIENTE
        const partido = await client.query('select max(id) id_partido from partido order by fecha desc');
        const id_partido = partido.rows[0].id_partido;

        //BUSCO EL ID DEL PARTIDO ANTERIOR
        const queryAnteriorPartido = {
            text: 'select max(id) id_partido from partido where id_partido < $1 order by fecha desc',
            values: [id_partido]
        }
        const partido_anterior = await client.query(queryAnteriorPartido);

        const id_partido_anterior = partido_anterior.rows[0].id_partido;

        //BUSCO ESTADO DEL PARTIDO ANTERIOR SI JUGO.
        const queryEstadoPartidoAnteriorPorJugador = {
            text: 'select * from partido_jugador where id_partido = $1 and id_jugador = coalesce($2, id_jugador) and nombre = coalesce($3, nombre) order by fecha desc',
            values: [id_partido_anterior, jugador.id_jugador, jugador.nombre]
        }
        const estado_partido_anterior = await client.query(queryEstadoPartidoAnteriorPorJugador);

        //es este el estado????
        const estado_jugador_partido_anterior = estado_partido_anterior.rows[0].condicion;

        client.release();

        return estado_jugador_partido_anterior;
    }
    catch (err) {
        client.release();
        console.log(err);
        throw err;
    }
}

// METODO para buscar si hay cupo para un jugador
const buscarSiHayCupoYAsignar = async (pool, jugador) => {
    const client = await pool.connect();
    try {
        console.log("buscarSiHayCupoYAsignar");
        const estadoJugador = '';
        //BUSCO EL ID DEL PARTIDO MAS RECIENTE
        const partido = await client.query('select max(id) id_partido, invitados_pendientes from partido order by fecha desc');
        const id_partido = partido.rows[0].id_partido;
        const invitados_pendientes = partido.rows[0].invitados_pendientes;

        if (invitados_pendientes > 0) {
            //LO PASAMOS A TITULAR
            estadoJugador = 'C';

            //RESTAMOS UN CUPO
            const queryConfirmacion = {
                text: 'update partido set invitados_pendientes = $1 WHERE id_partido = $2',
                values: [--invitados_pendientes, id_partido]
            }
            await client.query(queryConfirmacion);
        }
        else {
            //NO HAY CUPO, QUEDA DE SUPLENTE
            estadoJugador = 'S';
        }

        client.release();

        return estadoJugador;
    }
    catch (err) {
        client.release();
        console.log(err);
        throw err;
    }
}

// METODO para generar un hueco en el partido para que la gente pueda anotarse
const generarHueco = async (pool, jugador) => {
    const client = await pool.connect();
    try {
        console.log("generarHueco");
        //BUSCO EL ID DEL PARTIDO MAS RECIENTE
        const partido = await client.query('select max(id) id_partido, invitados_pendientes from partido order by fecha desc');
        const id_partido = partido.rows[0].id_partido;
        const invitados_pendientes = partido.rows[0].invitados_pendientes;

        const queryConfirmacion = {
            text: 'update partido set invitados_pendientes = $1 WHERE id_partido = $2',
            values: [++invitados_pendientes, id_partido]
        }
        await client.query(queryConfirmacion);

        client.release();
    }
    catch (err) {
        client.release();
        console.log(err);
        throw err;
    }
}

// METODO para AGREGAR jugador
const agregarJugador = async (pool, jugador, transporter) => {
    const client = await pool.connect();
    try {
        console.log("AGREGAR JUGADOR!");

        if (jugador && jugador.nombre && jugador.apellido && jugador.email) {
            //INSERTO EL NUEVO Jugador
            const queryNuevoJugador = {
                text: 'insert into jugador (nombre, apellido, mail, telefono) values ($1, $2, $3, $4)',
                values: [jugador.nombre, jugador.apellido, jugador.email, jugador.telefono]
            }
            await client.query(queryNuevoJugador);

            if (jugador.email) {
                const mailOptions = {
                    from: 'partidodelosmiercoles@gmail.com',
                    to: jugador.email,
                    subject: 'Partido de los Miercoles',
                    html: 'USTED HA SIDO AGREGADO al evento y futuros'
                };

                transporter.sendMail(mailOptions, function (err, info) {
                    if (err)
                        console.log("Error enviando mail partido " + err)
                    else
                        console.log("Salio el email aparentemente bien " + info);
                });
            }
            client.release();
        }

        else {
            client.release();
            throw new Error("Por favor Complete todos los datos obligatorios")
        }

    }
    catch (err) {
        client.release();
        console.log(err);
        throw err;
    }
}

// METODO para confirmar al evento
const generarConfirmacion = async (pool, jugador) => {
    const client = await pool.connect();
    try {
        console.log("Generar Confirmacion!");
        const condicion_partido = '';

        //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
        const partido = await client.query('select max(id) id_partido from partido');
        const id_partido = partido.rows[0].id_partido;

        console.log("ID_PARTIDO " + id_partido);

        console.log("jugador.jugador " + jugador.jugador);

        console.log("jugador.confirma " + jugador.confirma);

        const estado_anterior = buscarEstadoAnterior(pool, jugador);
        console.log("estado_anterior " + estado_anterior);

        const estado_actual = jugador.confirma;

        // Si el tipo confirmo el partido y el anterioR fue titular JUEGA
        if (estado_actual == 'C' && estado_anterior == 'C') {
            condicion_partido = 'C'
        }

        // Si el tipo confirmo el partido y el anterior fue baja o suplente SUPLENTE
        if (estado_actual == 'C' && (estado_anterior == 'B' || estado_anterior == 'S')) {
            condicion_partido = buscarSiHayCupoYAsignar(pool, jugador)
        }

        // Si el tipo se dio de baja y el anterior fue titular y jugo, se da de baja, genera un hueco y eso dispara el poner el primer suplente disponible como titular.
        if (estado_actual == 'B' && estado_anterior == 'C') {
            condicion_partido = 'B'
            generarHueco(pool);
        }

        // Si el tipo se dio de baja y el anterior fue baja u suplente, nada.
        if (estado_actual == 'B' && (estado_anterior == 'B' || estado_anterior == 'S')) {
            condicion_partido = 'B'
        }

        //INSERTO EL NUEVO PARTIDO
        const queryConfirmacion = {
            text: 'update partido_jugador set condicion = $2 where jugador_partido_id = $1 and id_partido = $3',
            values: [jugador.jugador, condicion_partido, id_partido]
        }
        await client.query(queryConfirmacion);

        client.release();
    }
    catch (err) {
        client.release();
        console.log(err);
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

// METODO ADMIN PARA GENERAR EL EVENTO
app.post('/crear-partido', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        var fechaArray = 'req.body.fecha'.split('/');
        var pattern = /(\d{2})\/(\d{2})\/(\d{4})/;
        var dt = new Date(fechaArray[2], fechaArray[1] - 1, fechaArray[0]);
        console.log('Dia de la semana que se dispara el evento: ' + req.body.fecha);

        console.log('Dia de la semana que se dispara el evento: ' + dt.getDay());

        generarNuevoPartido(pool, req.body.fecha, transporter);

        res.send('Partido Creado exitosamente, enviando invitaciones a los jugadores');
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO ADMIN PARA AGREGAR UN NUEVO INVITADO
app.post('/agregar-invitado', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        agregarNuevoInvitado(pool, req.body, transporter);

        res.send('JUGADOR CONFIRMADO MANUALMENTE, se le ha informado.');
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO ADMIN PARA AGREGAR UN NUEVO JUGADOR
app.post('/agregar-jugador', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        agregarJugador(pool, req.body, transporter);

        res.send('JUGADOR CONFIRMADO MANUALMENTE, se le ha informado.');
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO ADMIN PARA CONFIRMAR AL EVENTO POR PARTE DE LOS INVITADOS
app.post('/confirmar', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        generarConfirmacion(pool, req.body, transporter);

        res.send('Confirmacion exitosa!');
    } catch (err) {
        console.error(err);
        res.send("Error creando partido " + err);
    }
});

// METODO para devolver el nombre del usuario
app.post('/get-user-name', async (req, res) => {
    const client = await pool.connect()
    try {
        console.log("Obtener el nombre del user ID: " + req.body.id);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        if (req.body.id) {
            //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
            const queryBuscarNombre = {
                text: 'select j.nombre from jugador j inner join partido_jugador pj on pj.id_jugador = j.id where pj.jugador_partido_id = $1',
                values: [req.body.id]
            }
            const resultadoNombre = await client.query(queryBuscarNombre);

            const nombre = resultadoNombre.rows[0].nombre;

            client.release();
            res.send(nombre);
        } else {
            client.release();
            res.send("No hay ID a buscar")
        }
    } catch (err) {
        console.error(err);
        client.release();
        res.send("Error creando partido " + err);
    }
});

// METODO para devolver los confirmados
app.get('/get-confirmados', async (req, res) => {
    const client = await pool.connect()
    try {
        console.log("Obtener COnfirmados al evento");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
        const partido = await client.query('select max(id) id_partido from partido');
        const id_partido = partido.rows[0].id_partido;

        //BUSCO EL ID RECIEN INSERTADO DEL PARTIDO
        const queryConfirmados = {
            text: 'select pj.nombre, pj.condicion from partido_jugador pj where pj.id_partido = $1',
            values: [id_partido]
        }
        const resultadoConfirmados = await client.query(queryConfirmados);

        client.release();
        res.send(resultadoConfirmados.rows);
    } catch (err) {
        console.error(err);
        client.release();
        res.send("Error creando partido " + err);
    }
});

// METODO para devolver Historico de partidos
// TODO
app.get('/get-historico', async (req, res) => {
    const client = await pool.connect()
    try {
        console.log("Obtener COnfirmados al evento");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Origin', 'https://fulbapp-cli.herokuapp.com');

        const resultadoHistorico = await client.query('SELECT fecha, goles_blanco, goles_azul FROM partido');

        client.release();
        res.send(resultadoHistorico.rows);
    } catch (err) {
        console.error(err);
        client.release();
        res.send("Error creando partido " + err);
    }
});

app.listen(process.env.PORT || 5001, function () {
    console.log('Example app listening on port ....!');
    startKeepAlive();
});
