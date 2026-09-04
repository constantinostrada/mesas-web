# convention

A rule the codebase follows — naming, patterns, and where things live.

## `estados.js` es la única copia del vocabulario de estados en este repo

**What:** `TRANSICIONES`, `ETIQUETAS` y `esCerrado` viven en `estados.js`, en la
raíz. `panel.js` y `app.js` los importan; ninguna pantalla define los suyos.
**Why:** El contrato ya está duplicado entre repos (`mesas-shared`, `mesas-api`,
`mesas-web`) hasta que `mesas-shared` se publique como paquete. Duplicarlo
*dentro* de este repo agrega una tercera copia y garantiza que las dos
pantallas terminen llamando distinto a lo mismo: el work order pide
explícitamente que el cliente vea las mismas etiquetas que el mozo.
**Where:** `estados.js`, importado por `panel.js` y `app.js`.
**Learned:** 2026-09-03, al agregar el estado en vivo a la pantalla del cliente.

## Polling cada 4s con setInterval, sin websockets, en las dos pantallas

**What:** Cliente y panel refrescan con `setInterval(..., 4000)` y una guarda
de un ciclo a la vez (`enVuelo`, sólo en el cliente). Si un ciclo falla no se
repinta: se mantiene el último estado conocido y el corte se avisa al margen
con `conexion.js` (ver la decisión del aviso de conexión), sin tapar la lista.
Cada ciclo le reporta a ese módulo cómo salió: `exito()` o `fallo()`.
**Why:** 4s alcanza para un salón y evita la infraestructura de websockets.
Sin la guarda, dos ciclos solapados con la API lenta pueden repintar en orden
invertido y mostrar un estado viejo. Y un error que tape la lista deja al
cliente peor que un dato de hace unos segundos.
**Where:** `app.js` (`ciclo`), `panel.js` (`refrescar`), `conexion.js`.
**Learned:** 2026-09-03. Al agregar una llamada nueva a un ciclo, va dentro del
`Promise.all` que ya existe: "actualización buena" es todo-o-nada, y de eso
depende que el aviso de conexión no mienta.

## La pantalla del cliente actualiza sola con el mismo patrón que panel.js: setInterval de 4…

What: La pantalla del cliente actualiza sola con el mismo patrón que panel.js: setInterval de 4s, con guarda para que no se solapen dos ciclos, y pinta desde un mapa de 'último estado conocido' en memoria en vez de repintar directo desde la respuesta HTTP. · Why: — · Where: app.js, panel.js. · Learned: si un ciclo de polling falla (API caída), no se repinta nada — la lista queda con el último estado conocido y aparece un aviso discreto arriba de la lista en vez de vaciar la pantalla o tapar todo con un error (desde 2026-09-04 ese aviso lo maneja conexion.js: recién a los 3 ciclos fallidos y con el tiempo desde la última actualización buena). <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-4 -->

## En la lista de pedidos del cliente, los estados activos (pedido, en_preparacion, listo_pa…

What: En la lista de pedidos del cliente, los estados activos (pedido, en_preparacion, listo_para_servir) se muestran arriba y destacados, y los cerrados (servido, pagado, cancelado) bajan a un bloque atenuado abajo en vez de desaparecer. · Why: — · Where: app.js, index.html, styles.css (reusa .estado y .estado.listo existentes; agrega estilo atenuado para cerrados y chip rojo para cancelado). <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-5 -->

## El panel del mozo filtra los cancelados en el navegador, no en la API

**What:** `panel.js` descarta los pedidos en `cancelado` antes de pintar
(`todos.filter(...)` al entrar a `pintar`). `GET /pedidos` los sigue
devolviendo.
**Why:** Las dos pantallas quieren cosas opuestas del mismo estado: para el
mozo un pedido cancelado es trabajo que ya no existe y tiene que desaparecer;
para el cliente es cómo se entera de que su plato no viene, y se muestra
atenuado en "Ya cerrados". Filtrar en la API serviría a una pantalla y rompería
la otra.
**Where:** `panel.js` (`pintar`), contra `app.js` (`esCerrado`,
`pintarMisPedidos`).
**Learned:** 2026-09-03. Con esto la tarjeta desaparece sola en el poll de 4s
—sin recargar— incluso si la cancelación la disparó otro (el cliente, la API);
no hace falta nada más que el filtro, el polling ya estaba.

## Los filtros de `GET /pedidos` se acumulan en AND, y un id inexistente es 404

**What:** `GET /pedidos` acepta `?mozo_id=` y `?mesa_id=`, combinables: se
aplican los dos en AND, y cualquiera de los dos puede faltar. Un `mesa_id` que
no existe responde 404 `{"error":"La mesa no existe"}` — el mismo código y el
mismo texto que ya usaba `POST /pedidos`.
**Why:** Un id inexistente no es "una mesa sin pedidos": devolver `[]` haría que
la pantalla del cliente mostrara "todavía nada" para siempre sin que nadie se
enterara del typo. Y filtros que se acumulan evitan un endpoint nuevo cuando
haga falta cruzar dos criterios ("los de esta mesa que atiende este mozo").
**Where:** `mesas-api/src/server.js` (`GET /pedidos`), `mesas-api/README.md`.
**Learned:** 2026-09-03. Al agregar un filtro nuevo a este endpoint, validarlo
contra el store y reusar el 404 que ya define `POST /pedidos` para esa entidad,
en vez de inventar una redacción propia.
