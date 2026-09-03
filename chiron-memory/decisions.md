# decision

A choice made and the reasoning behind it — the path taken over the alternatives.

## El cliente filtra sus pedidos en el navegador, no en la API
**What:** La pantalla del cliente (`app.js`) trae `GET /pedidos` completo y lo
cruza contra los ids que guardó en `localStorage` (`mesas-web:pedidos`, un
array de ids por `mesa_id`). No pide un filtro a la API.
**Why:** `GET /pedidos` en `mesas-api` sólo acepta `?mozo_id=`; no hay filtro
por mesa ni endpoint por id. Y la API no tiene noción de "cliente": dos
personas en la misma mesa son indistinguibles para ella, así que el recorte
"mis pedidos" sólo puede vivir en el navegador que los hizo. Con un salón chico
traer todo alcanza; el día que no, el filtro tiene que ir a la API.
**Where:** `app.js` (`refrescarPedidos`, `idsDeMesa`).
**Learned:** 2026-09-03, al implementar el estado en vivo para el cliente.

## La mesa elegida se persiste junto con los ids de pedidos
**What:** `app.js` guarda la mesa en `localStorage` (`mesas-web:mesa`) y la
restaura al abrir.
**Why:** Los pedidos se guardan por mesa. Si al reabrir el navegador el
`<select>` volviera a la primera mesa, el cliente no vería sus pedidos aunque
estuvieran guardados — la persistencia de los ids no sirve de nada sin esto.
**Where:** `app.js` (`leerMesa`, `guardarMesa`).
**Learned:** 2026-09-03.

## Los pedidos cerrados se atenúan y bajan, no se borran en vivo
**What:** `servido`, `pagado` y `cancelado` se pintan en un bloque "Ya cerrados"
abajo y atenuado. La purga de `localStorage` (ids que la API no conoce, y los
`pagado`) corre UNA vez por mesa al primer ciclo del poll, no en cada ciclo.
**Why:** Si purgara en cada ciclo, el pedido que el mozo acaba de marcar pagado
se borraría de la pantalla al segundo siguiente, delante del cliente que lo
está mirando. Un `cancelado` que desaparece es peor todavía: el cliente queda
esperando algo que nadie le va a traer. La purga en carga limpia igual, sin que
nadie vea nada evaporarse.
**Where:** `app.js` (`purgarViejos`, `purgadas`, `pintarMisPedidos`).
**Learned:** 2026-09-03.
