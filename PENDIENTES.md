# Pendientes — mesas-web

## Nota por plato al pedir
Un campo corto junto a cada plato, y mostrarla en el panel del mozo.
**Empieza en:** `mesas-shared`. **Toca también:** `mesas-api`.

## Pedir la carta a la API en vez de tenerla copiada
Hoy `index.html` la trae de `/carta`, pero el panel duplica etiquetas y
transiciones. Cuando la carta salga a un archivo, esto se simplifica.
**Toca también:** `mesas-api`.

## Que el cliente vea el estado de su pedido
Después de pedir sólo ve "enviado". No tiene forma de saber si ya está en
preparación sin preguntarle al mozo.
**Toca también:** `mesas-api` (buscar pedidos por mesa).

## Dividir la cuenta
Al pagar, poder partir el total entre varias personas.
