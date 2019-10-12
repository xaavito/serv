# Server!

## Correr localmente
npm run server

## Base para beginers
https://www.twilio.com/blog/react-app-with-node-js-server-proxy

## Uri al server
https://fulbapp-serv.herokuapp.com/

## Ver logs del server.
```
heroku logs --tail
```

## DB Structure
```
CREATE TABLE partido (
   id SERIAL NOT NULL,
   fecha date NOT NULL,
   goles_blanco numeric not null,
   goles_azul numeric not null,
   CONSTRAINT id_partido_pk PRIMARY KEY (id)
);

CREATE TABLE jugador (
   id SERIAL NOT NULL,
   nombre VARCHAR(1000) NOT NULL,
   apellido VARCHAR(1000) NOT NULL,
   mail VARCHAR(1000) NOT NULL,
   telefono VARCHAR(1000),
   CONSTRAINT id_jugador_pk PRIMARY KEY (id)
);

CREATE TABLE partido_jugador (
   id_partido INTEGER NOT NULL REFERENCES partido(id),
   id_jugador INTEGER NOT NULL REFERENCES jugador(id),
   jugador_partido_id SERIAL NOT NULL,
   asistio boolean,
   condicion VARCHAR(20) not null
);
```

## CONECTARTE CON LA BD
```
heroku pg:psql
```

## Mailing
https://codeburst.io/sending-an-email-using-nodemailer-gmail-7cfa0712a799

## deploy
login -> heroku login

push -> git push heroku master

En modo desa podemos usar algo asi... --exec nodemon | pino-colada"

## Para modo desarrollo
npm run start:dev