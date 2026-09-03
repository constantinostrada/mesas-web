# Pendientes — mesas-web

## Nota por plato al pedir
Un campo corto junto a cada plato, y mostrarla en el panel del mozo.
**Empieza en:** `mesas-shared`. **Toca también:** `mesas-api`.

## Publicar `mesas-shared` como paquete
Dentro de este repo el vocabulario de estados ya vive una sola vez, en
`estados.js`, pero sigue duplicado entre `mesas-shared`, `mesas-api` y acá.
Hoy `mesas-shared` ni conoce `listo_para_servir`.
**Empieza en:** `mesas-shared`. **Toca también:** `mesas-api`.

## Filtrar pedidos por mesa en la API
Hoy la pantalla del cliente trae `GET /pedidos` entero y cruza contra los ids
que guardó en `localStorage`. Con un salón chico alcanza; con muchos pedidos
abiertos, el filtro tiene que ir a la API.
**Toca también:** `mesas-api`.

## Dividir la cuenta
Al pagar, poder partir el total entre varias personas.
