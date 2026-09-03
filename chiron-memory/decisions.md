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

## La pantalla del cliente (app.js) filtra 'sus pedidos' trayendo GET /pedidos completo y cr…

What: La pantalla del cliente (app.js) filtra 'sus pedidos' trayendo GET /pedidos completo y cruzando con los ids guardados en localStorage, en vez de pedirle a la API que filtre por mesa. · Why: mesas-api no soporta ?mesa_id= en GET /pedidos (sólo ?mozo_id=); la alternativa de mostrar todos los pedidos de la mesa fue descartada porque el intent pedía 'sus pedidos' de esta persona/navegador, no los de otros comensales. · Where: app.js. · Learned: con muchas mesas/pedidos abiertos este filtrado client-side no escala; queda pendiente agregar el filtro server-side en mesas-api. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-0 -->

## app.js persiste en localStorage la mesa elegida (mesas-web:mesa) y los ids de pedidos por…

What: app.js persiste en localStorage la mesa elegida (mesas-web:mesa) y los ids de pedidos por mesa (mesas-web:pedidos), restaurando ambos al cargar. · Why: sin guardar la mesa, el <select> volvía a la primera mesa al reabrir el navegador y los pedidos guardados no se mostraban aunque los ids siguieran ahí. · Where: app.js. · Learned: todo acceso a localStorage debe ser tolerante a fallos (try/catch) porque en modo privado del navegador puede lanzar. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-1 -->

## La purga de ids de localStorage (pedidos en estado 'pagado', o que la API ya no conoce) c…

What: La purga de ids de localStorage (pedidos en estado 'pagado', o que la API ya no conoce) corre una sola vez al cargar la pantalla del cliente, no en cada ciclo de polling. · Why: el store de mesas-api es en memoria (si reinicia, ids quedan colgados) pero purgar 'pagado' en cada ciclo hacía desaparecer la tarjeta de golpe mientras el cliente la estaba mirando, violando el requisito de que un pedido servido/pagado no desaparezca abruptamente. · Where: app.js. · Learned: separar 'cuándo se olvida un pedido' (al recargar) de 'cuándo se repinta' (cada poll) evita que un cambio de estado en vivo borre contenido que el usuario está viendo. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-2 -->

## El mensaje estático "Pedido X enviado" que mostraba la pantalla del cliente al confirmar…

What: El mensaje estático "Pedido X enviado" que mostraba la pantalla del cliente al confirmar un pedido fue eliminado por completo; la lista de pedidos con estado lo reemplaza, y el mozo asignado (que antes se mencionaba una sola vez en ese mensaje y se perdía) ahora es un campo persistente de cada tarjeta de pedido, visible también después de recargar. · Why: — · Where: app.js, index.html. · Learned: cualquier dato que sólo vivía en un mensaje de confirmación efímero desaparecía al recargar; moverlo a la tarjeta persistida en localStorage lo hace sobrevivir junto con el resto del estado del pedido. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-7 -->

## Cancelar es su propio endpoint (`POST /pedidos/:id/cancelar`), no un `/estado` más

**What:** La cancelación se expone como `POST /pedidos/:id/cancelar` en
`mesas-api`, aunque `POST /pedidos/:id/estado` con `{"estado":"cancelado"}`
haría lo mismo (la transición ya era legal). El endpoint nuevo responde el
mismo 409 y con la misma redacción que `/estado`
(`No se puede pasar de "<origen>" a "cancelado"`).
**Why:** Quien cancela no está eligiendo el próximo estado del pedido, está
dándolo de baja: no tiene por qué saber que "cancelado" es un estado de la
máquina ni cómo se escribe. Reusar el mensaje de error, en cambio, es
deliberado — para quien llama es la misma regla del dominio rechazando, y dos
textos distintos para lo mismo confunden.
**Where:** `mesas-api/src/server.js`, `mesas-api/README.md`;
`mesas-web/panel.js` (el botón elige ruta según el destino).
**Learned:** 2026-09-03. El botón de cancelar del panel se sigue armando solo
desde `TRANSICIONES` (no hay lista aparte de acciones), pero se rotula
"Cancelar" y no `ETIQUETAS.cancelado` ("Cancelado"): un botón dice lo que hace,
no a qué estado lleva.

## "Se cancela mientras siga en cocina" se deriva de las transiciones, no de una lista

**What:** `esCancelable(estado)` en `mesas-shared/src/estados.js` (replicada en
`mesas-api/src/estados.js`) es `puedePasar(estado, "cancelado")`, no una lista
de estados cancelables. Cancelable en `pedido`, `en_preparacion` y
`listo_para_servir`; no en `servido`, `pagado` ni `cancelado`.
**Why:** Mismo criterio que `esCerrado` en `mesas-web/estados.js`: si la regla
se escribe como lista, un estado nuevo agregado a `TRANSICIONES` queda afuera
por olvido, o uno que no debía se vuelve cancelable. La tabla de transiciones
ya es la fuente de verdad; la función sólo le pone nombre a la regla para que
la API no tenga que leerla a ojo.
**Where:** `mesas-shared/src/estados.js`, `mesas-api/src/estados.js`.
**Learned:** 2026-09-03. El work order pedía "sólo se puede cancelar en estados
previos a `en_camino`", pero `en_camino` NO existe en esta máquina de estados:
el estado en que el plato ya salió de la cocina y llegó a la mesa es `servido`,
y se implementó con ese mapeo (`en_camino` ≡ `servido`). `listo_para_servir` sí
es cancelable: el plato está emplatado pero todavía en la cocina.
