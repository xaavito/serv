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
CREATE TABLE partido (
   id   NUMERIC       NOT NULL,
   fecha    date NOT NULL,
   goles_blanco     numeric not null,
   goles_azul numeric not null          ,
   CONSTRAINT id_pk PRIMARY KEY (id)
);

CREATE TABLE jugador (
   id   NUMERIC       NOT NULL,
   nombre VARCHAR(1000) NOT NULL,
   apellido VARCHAR(1000) NOT NULL,
   mail VARCHAR(1000) NOT NULL,
   telefono    VARCHAR(1000),
CONSTRAINT id_jugador_pk PRIMARY KEY (id)
);

CREATE TABLE partido_jugador (
   id_partido   NUMERIC       NOT NULL REFERENCES partido(id),
   id_jugador NUMERIC       NOT NULL REFERENCES jugador(id),
   asistio boolean,
   condicion VARCHAR(20) not null
);

## CONECTARTE CON LA BD
```
heroku pg:psql
```